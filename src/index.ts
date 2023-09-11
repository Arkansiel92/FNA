import * as puppeteer from "puppeteer";
import * as fs from 'fs';

interface data {
    min: number
    amount: string | null
    cities: string[]
    options: string[]
}

interface result {
    city: string | null,
    price: string | null,
    link: string | null,
    parts: string | null,
    size: string | null,
    rooms: string | null
}

const data: data = {
    min: 800,
    amount: '1000',
    cities : [
        'Colombes', 
        'Cormeilles-en-Parisis', 
        'Bezons',
        'Franconville 95130',
        'Ermont',
        'Eaubonne',
        'Montigny-Les-Cormeilles'
    ],
    options: [
        'appartement'
    ]
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
        parts: null,
        size: null,
        rooms: null
    }

    result.city = await offer.$eval('a > .h1', span => span.textContent);
    if(result.city) result.city.replace(/\u000A|\u0009/g, '');

    result.price = await offer.$eval('a > .item-price', span => span.textContent);
    result.link = await offer.$eval('a', a => a.href);

    const tags = await offer.$$('.item-tags > li');

    for(const tag of tags) {
        const t = await tag.evaluate(li => li.textContent);

        if(t) {
            if (t.includes('pièce') || t.includes('pièces')) {
                result.parts = t;
            } else if (t.includes('m2')) {
                result.size = t;
            } else if (t.includes('chambre') || t.includes('chambres')) {
                result.rooms = t;
            }
        }
    }

    return await saveInFile(result);
}

async function saveInFile(result: result) {
    
    if(result) {
        const str = `${result.city} | ${result.price} | ${result.parts} | ${result.size} | ${result.link} | ${result.rooms ?? result.rooms}`;

        fs.appendFile("offers.txt", str, (err) => {
            if(err) console.log('Une erreur est survenue, l\'offre n\'a pas été sauvegardé');

            else console.log('✅ L\'offre a été enregistrée');
        })
    } else {
        return false;
    }
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
    console.log('\n Ville(s) recherchée(s) :');
    for(const city of data.cities) {
        await waitForInput(page, '#token-input-geo_objets_ids', city);
        await timeout(1000);
        await pressKeyboard(page, 'Enter');
        console.log("✅", city);
    }

    console.log('\n Bien(s) recherché(s) : ')
    data.options.forEach(async opt => {
        console.log('✅', opt);
        (await page).select('#homepage_recherche_form > div > div.col-4-5 > div.row.margin-bottom-20 > div:nth-child(2) > div > div > select', opt)
    })

    if(data.amount) await waitForInput(page, '#prix_max', data.amount);

    // access to offers
    await waitForButton(page, '#homepage_recherche_form > div > div.col-1-5.align-right > div.no-margin-bottom > a');
    await waitForButton(page, '#submit-sans-creer-alerte');

    await timeout(2000);

    const offers = await (await page).$$('.item-body');

    for(const offer of offers) {
        await CheckOffer(offer);
    }


}

main();