const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Movie = require('./models/Movie');

async function getPagina(url){
    try{
        return axios.get(url);
    }catch(error){
        console.log(error);
    }
}

function extrairDados(page, elementItem){
    let result = [];
    const dom = cheerio.load(page);
    dom(elementItem).
        find('tr').
        each( (i, elem) => {
            let resultColunas = [];
            dom(elem).
                find('td').
                each( (j, coluna) => {
                    let text = dom(coluna).text().replace(/\s\s+/g, ' ');
                    resultColunas.push(text);
                });
            result.push({ linha: i, elements: resultColunas });
        });
    return result;
}

function cleanData(text, inicio, fim){
    return text.substring(inicio, fim).trim();
}

function parserDados(item) {
    let result = {};
    
    let rePosicao = /( )*[0-9]+\./g
    let posicao = item.elements[1].match(rePosicao)[0];
    result['posicao'] = cleanData(posicao, 1, posicao.length-1);

    let reTituloFilme = /\.\s(.*)\s\(/g
    let tituloFilme = item.elements[1].match(reTituloFilme)[0];
    result['tituloFilme'] = cleanData(tituloFilme, 1, tituloFilme.length-1);

    let reAno = /\([0-9]{4}\)/g
    let ano = item.elements[1].match(reAno)[0];
    result['ano'] = cleanData(ano, 1, ano.length-1);

    result['nota'] = item.elements[2].trim();
    return result;
}

async function main(){
    mongoose.connect('mongodb://localhost:27017/imdb');
    mongoose.connection.once('open', () => {
        console.log('Database connected!');
    })
    let resultData = [];
    let urlChamada = 'https://www.imdb.com/chart/top?ref_=nv_mv_250';

    //Call the url to crawl
    let resultPage = await getPagina(urlChamada);

    //Data Extractor
    if(resultPage.data != null){
        let table = [];
        table = extrairDados(resultPage.data, '.chart');
        //Parser 
        for(let index in table){
            if(table[index].elements.length > 0){
                resultData.push(parserDados(table[index]));
            }
        }
    }

    //Persist at database
    resultData.map((item) => {
        console.log(JSON.stringify(item));
        const movie = new Movie (item);
        movie.save();
    })

    process.exit(0);
}

main();