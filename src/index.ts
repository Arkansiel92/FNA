import * as puppeteer from "puppeteer";
import * as fs from 'fs';
import { data, filters, result } from "./types";

const data: data = {
    amount: '1000',
    cities : [
        'Colombes', 
        'Cormeilles-en-Parisis', 
        'Bezons',
        'Franconville 95130',
        'Ermont',
        'Eaubonne',
        'Montigny-Les-Cormeilles',
        'Courbevoie'
    ],
    options: [
        'appartement'
    ]
}

const filters: filters = {
    sizeMin: 30,
    partsMin: 0,
    roomsMin: 1
}

function timeout(ms: number): Promise<void> {
    return new Promise(res => {
        setTimeout(res, ms)
    });
}

async function waitForButton(page: Promise<puppeteer.Page>, selector: string): Promise<void> {
    const currentPage = await page;
    
    await currentPage.waitForSelector(selector);
    await currentPage.click(selector);
}

async function waitForInput(page: Promise<puppeteer.Page>, selector: string, input: string): Promise<void> {
    const currentPage = await page;
    
    await currentPage.waitForSelector(selector);
    await currentPage.type(selector, input);
}

async function pressKeyboard(page: Promise<puppeteer.Page>, key: puppeteer.KeyInput) {
    const currentPage = await page;

    await currentPage.keyboard.press(key);
}

async function CheckOffer(offer: puppeteer.ElementHandle<Element>) {
    const result: result = {
        city: null,
        price: null,
        link: null,
        parts: 0,
        size: 0,
        rooms: 0
    }

    result.city = await offer.$eval('a > .h1', span => span.textContent);
    if(result.city) {
        let str = result.city.split(' ');

        if(str[0] === "Paris") {
            result.city = `${str[0]} ${str[1]}`;
        } else {
            result.city = str[0];
        }
    };

    result.price = await offer.$eval('a > .item-price', span => span.textContent);
    result.link = await offer.$eval('a', a => a.href);

    const tags = await offer.$$('.item-tags > li');

    for(const tag of tags) {
        const t = await tag.evaluate(li => li.textContent);

        if(t) {
            let split = t.split(' ');
            if (t.includes('pièce') || t.includes('pièces')) {
                result.parts = Number(split[0]);
            } else if (t.includes('m2')) {
                result.size = Number(split[0]);
            } else if (t.includes('chambre') || t.includes('chambres')) {
                result.rooms = Number(split[0]);
            }
        }
    }
    
    if(result.parts >= filters.partsMin && result.size >= filters.sizeMin && result.rooms >= filters.roomsMin) {
        return await saveInFile(result);
    }

    return console.log(`❌ ${result.city} | ${result.price} | ${result.parts} pièces | ${result.size} m2 | ${result.rooms} chambre(s)`);
}

async function saveInFile(result: result) {
    
    if(result) {
        const str = `\n ${result.city} | ${result.price} | ${result.parts} pièces | ${result.size} m2 | ${result.link} | ${result.rooms} chambre(s)`;

        fs.appendFile("offers.txt", str, (err) => {
            if(err) console.log('❌ Une erreur est survenue, l\'offre n\'a pas été sauvegardé');

            else console.log(`✅ ${result.city} | ${result.price} | ${result.parts} pièces | ${result.size} m2 | ${result.rooms} chambre(s)`);
        })
    }
}

async function scroll(page: Promise<puppeteer.Page>, index: number) {
    console.log('\nChargements des offres...');
    
    for (let i = 0; i < index; i++) {
        (await page).evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });  
        await timeout(3000);
        console.log('... ' + (i / index) * 100 + '%');
    };
}

async function main(): Promise<void> {
    const browser = await puppeteer.launch({
        headless: "new",
        devtools: false
    })
    
    const page = browser.newPage();

    (await page).setViewport({width: 1920, height: 1080});
    (await page).goto("https://www.pap.fr/locataire");

    // skip cookies
    await waitForButton(page, '.sd-cmp-3-lsB');

    // add cities to choice
    console.log('\nVille(s) recherchée(s) :');
    for(const city of data.cities) {
        await waitForInput(page, '#token-input-geo_objets_ids', city);
        await timeout(1000);
        await pressKeyboard(page, 'Enter');
        console.log("✅", city);
    }

    console.log('\nBien(s) recherché(s) : ')
    data.options.forEach(async opt => {
        console.log('✅', opt);
        (await page).select('#homepage_recherche_form > div > div.col-4-5 > div.row.margin-bottom-20 > div:nth-child(2) > div > div > select', opt)
    })

    if(data.amount) await waitForInput(page, '#prix_max', data.amount);

    // access to offers
    await waitForButton(page, '#homepage_recherche_form > div > div.col-1-5.align-right > div.no-margin-bottom > a');
    await waitForButton(page, '#submit-sans-creer-alerte');

    await timeout(2000);

    await scroll(page, 10);

    const offers = await (await page).$$('.item-body');

    console.log('\n✅ Offres trouvées :', offers.length);

    if(offers) {
        for(const offer of offers) {
            await CheckOffer(offer);
        }
    } else {
        console.log('❌ Aucune offre trouvée.');
        await browser.close();
        return;
    }
}

main();