"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = __importStar(require("puppeteer"));
const fs = __importStar(require("fs"));
const data = {
    amount: '1000',
    cities: [
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
};
const filters = {
    sizeMin: 30,
    partsMin: 0,
    roomsMin: 1
};
function timeout(ms) {
    return new Promise(res => {
        setTimeout(res, ms);
    });
}
function waitForButton(page, selector) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentPage = yield page;
        yield currentPage.waitForSelector(selector);
        yield currentPage.click(selector);
    });
}
function waitForInput(page, selector, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentPage = yield page;
        yield currentPage.waitForSelector(selector);
        yield currentPage.type(selector, input);
    });
}
function pressKeyboard(page, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentPage = yield page;
        yield currentPage.keyboard.press(key);
    });
}
function CheckOffer(offer) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {
            city: null,
            price: null,
            link: null,
            parts: 0,
            size: 0,
            rooms: 0
        };
        result.city = yield offer.$eval('a > .h1', span => span.textContent);
        if (result.city) {
            let str = result.city.split(' ');
            if (str[0] === "Paris") {
                result.city = `${str[0]} ${str[1]}`;
            }
            else {
                result.city = str[0];
            }
        }
        ;
        result.price = yield offer.$eval('a > .item-price', span => span.textContent);
        result.link = yield offer.$eval('a', a => a.href);
        const tags = yield offer.$$('.item-tags > li');
        for (const tag of tags) {
            const t = yield tag.evaluate(li => li.textContent);
            if (t) {
                let split = t.split(' ');
                if (t.includes('pièce') || t.includes('pièces')) {
                    result.parts = Number(split[0]);
                }
                else if (t.includes('m2')) {
                    result.size = Number(split[0]);
                }
                else if (t.includes('chambre') || t.includes('chambres')) {
                    result.rooms = Number(split[0]);
                }
            }
        }
        if (result.parts >= filters.partsMin && result.size >= filters.sizeMin && result.rooms >= filters.roomsMin) {
            return yield saveInFile(result);
        }
        return console.log(`❌ ${result.city} | ${result.price} | ${result.parts} pièces | ${result.size} m2 | ${result.rooms} chambre(s)`);
    });
}
function saveInFile(result) {
    return __awaiter(this, void 0, void 0, function* () {
        if (result) {
            const str = `\n ${result.city} | ${result.price} | ${result.parts} pièces | ${result.size} m2 | ${result.link} | ${result.rooms} chambre(s)`;
            fs.appendFile("offers.txt", str, (err) => {
                if (err)
                    console.log('❌ Une erreur est survenue, l\'offre n\'a pas été sauvegardé');
                else
                    console.log(`✅ ${result.city} | ${result.price} | ${result.parts} pièces | ${result.size} m2 | ${result.rooms} chambre(s)`);
            });
        }
    });
}
function scroll(page, index) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\nChargements des offres...');
        for (let i = 0; i < index; i++) {
            (yield page).evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });
            yield timeout(3000);
            console.log('... ' + (i / index) * 100 + '%');
        }
        ;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer.launch({
            headless: "new",
            devtools: false
        });
        const page = browser.newPage();
        (yield page).setViewport({ width: 1920, height: 1080 });
        (yield page).goto("https://www.pap.fr/locataire");
        // skip cookies
        yield waitForButton(page, '.sd-cmp-3-lsB');
        // add cities to choice
        console.log('\nVille(s) recherchée(s) :');
        for (const city of data.cities) {
            yield waitForInput(page, '#token-input-geo_objets_ids', city);
            yield timeout(1000);
            yield pressKeyboard(page, 'Enter');
            console.log("✅", city);
        }
        console.log('\nBien(s) recherché(s) : ');
        data.options.forEach((opt) => __awaiter(this, void 0, void 0, function* () {
            console.log('✅', opt);
            (yield page).select('#homepage_recherche_form > div > div.col-4-5 > div.row.margin-bottom-20 > div:nth-child(2) > div > div > select', opt);
        }));
        if (data.amount)
            yield waitForInput(page, '#prix_max', data.amount);
        // access to offers
        yield waitForButton(page, '#homepage_recherche_form > div > div.col-1-5.align-right > div.no-margin-bottom > a');
        yield waitForButton(page, '#submit-sans-creer-alerte');
        yield timeout(2000);
        yield scroll(page, 10);
        const offers = yield (yield page).$$('.item-body');
        console.log('\n✅ Offres trouvées :', offers.length);
        if (offers) {
            for (const offer of offers) {
                yield CheckOffer(offer);
            }
        }
        else {
            console.log('❌ Aucune offre trouvée.');
            yield browser.close();
            return;
        }
    });
}
main();
