import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from '../api/client';
import '../styles/portfolio-details.css';


type Currency = {
    id: number;
    currency: string;
    symbol: string;
    ticker: string;
};

type Index = {
    id: number;
    currentPrice: number;
    currentConvertedPrice: number;
    monthlyDynamic: number;
    currency: Currency;
    indexName: string;
    indexISIN: string;
};

type Packet = {
    id: number;
    index: Index;
    currency: Currency;
    buyDate: string;
    quantity: number;
    initialPrice: number;
    currentPrice: number;
    initialConvertedPrice: number;
    currentConvertedPrice: number;
    dynamicFromBuyDate: number;
    convertedDynamicFromBuyDate: number;
};

type Portfolio = {
    id: number;
    name: string;
    currentValue: number;
    dynamicFromBuyDate: number;
    convertedDynamicFromBuyDate: number;
    packets: Packet[];
};

export const PortfolioDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                const response = await api.get(`/portfolio/portfolio-card/${id}`);
                setPortfolio(response.data);
            } catch (error) {
                console.error("Ошибка при загрузке портфеля:", error);
            }
        };

        fetchPortfolio();
    }, [id]);

    if (!portfolio) {
        return <div className="text-white p-4">Загрузка...</div>;
    }

    return (
        <div className="portfolio-container">
            <div className="glass-card">
                <h1 className="card-title">{portfolio.name}</h1>
                <p className="card-subtitle">Текущая стоимость: ${portfolio.currentValue.toFixed(2)}</p>
                <p className="card-subtitle">Динамика с даты покупки: {portfolio.dynamicFromBuyDate.toFixed(2)}%</p>
            </div>

            {portfolio.packets.map((packet) => (
                <div
                    key={packet.id}
                    className="w-4/5 bg-white/10 backdrop-blur-lg text-white rounded-2xl shadow-xl p-6 transform transition-transform hover:scale-105"
                >
                    <h2 className="card-title">{packet.index.indexName} ({packet.index.indexISIN})</h2>
                    <p className="card-subtitle">Валюта: {packet.currency.symbol}</p>
                    <p className="card-subtitle">Дата покупки: {packet.buyDate}</p>
                    <p className="card-subtitle">Количество: {packet.quantity}</p>
                    <p className="card-subtitle">Начальная цена: {packet.initialPrice.toFixed(2)} {packet.currency.symbol}</p>
                    <p className="card-subtitle">Текущая цена: {packet.currentPrice.toFixed(2)} {packet.currency.symbol}</p>
                    <p className="card-subtitle">Начальная стоимость: {packet.initialConvertedPrice.toFixed(2)} USD</p>
                    <p className="card-subtitle">Текущая стоимость: {packet.currentConvertedPrice.toFixed(2)} USD</p>
                    <p className="card-subtitle">Динамика: {packet.dynamicFromBuyDate.toFixed(2)}%</p>
                </div>
            ))}
        </div>
    );
};
