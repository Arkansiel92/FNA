export interface data {
    amount: string | null
    cities: string[]
    options: string[]
}

export interface filters {
    sizeMin: number,
    partsMin: number,
    roomsMin: number
}

export interface result {
    city: string | null,
    price: string | null,
    link: string | null,
    parts: number,
    size: number,
    rooms: number
}