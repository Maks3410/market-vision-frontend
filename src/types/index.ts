export interface Currency {
    id: number;
    currency: string;
    symbol: string;
    ticker: string;
}

export interface StockIndex {
    id: number;
    currentPrice: string;
    monthlyDynamic: number;
    currency: Currency;
    currentConvertedPrice: number;
    indexName: string;
    indexISIN: string;
}

export interface CurrencyRate {
    id: number;
    currentConvertedPrice: number;
    monthlyDynamic: number;
    currency: string;
    symbol: string;
    ticker: string;
}

export interface Stock {
    id: number;
    ticker: string;
    name: string;
    currency: Currency;
    currentPrice: number;
    currentUSDPrice: number;
    monthlyDynamic: number;
}

export interface PortfolioStock {
    id: number;
    stock: Stock;
    quantity: number;
    purchaseDate: string;
    purchasePrice: number;
}

export interface Portfolio {
    id: number;
    name: string;
    currentValue: number;
    dynamic: number;
}

export interface CreatePortfolioRequest {
    name: string;
    purchaseDate: string;
}

export interface AddStockToPortfolioRequest {
    stockId: number;
    quantity: number;
    purchaseDate: string;
    purchasePrice: number;
}

export interface UpdatePortfolioNameRequest {
    name: string;
}
