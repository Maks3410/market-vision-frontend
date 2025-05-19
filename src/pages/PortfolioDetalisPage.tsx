import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from '../api/client';
import { toast } from 'react-toastify';
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
    currency: Currency;
    packets: Packet[];
};

type PredictionResponse = {
    current_value: number;
    predicted_value: number;
    growth_percent: number;
    currency: Currency;
    days: number;
};

type PredictionPeriod = {
    label: string;
    days: number;
};

const predictionPeriods: PredictionPeriod[] = [
    { label: "Неделя", days: 7 },
    { label: "Месяц", days: 30 },
    { label: "Квартал", days: 90 },
    { label: "Полгода", days: 180 },
    { label: "Год", days: 365 },
    { label: "2 года", days: 730 },
    { label: "5 лет", days: 1825 }
];

interface NewPacket {
    portfolio_id: number;
    index_id: number;
    quantity: number;
    buy_date: string;
}

export const PortfolioDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [availableIndexes, setAvailableIndexes] = useState<Index[]>([]);
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
    const [isAddingPacket, setIsAddingPacket] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<PredictionPeriod>(predictionPeriods[1]); // По умолчанию месяц
    const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);
    const [newPacket, setNewPacket] = useState<NewPacket>({
        portfolio_id: Number(id),
        index_id: 0,
        quantity: 1,
        buy_date: new Date().toISOString().split('T')[0]
    });
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');

    const fetchAvailableCurrencies = async () => {
        try {
            const response = await api.get('/fixings/all-currencies-names');
            setAvailableCurrencies(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке списка валют:", error);
        }
    };

    const fetchAvailableIndexes = async () => {
        try {
            const response = await api.get('/fixings/all-indexes');
            setAvailableIndexes(response.data);
            if (response.data.length > 0) {
                setNewPacket(prev => ({ ...prev, index_id: response.data[0].id }));
            }
        } catch (error) {
            console.error("Ошибка при загрузке списка акций:", error);
        }
    };

    const handleAddPacket = async () => {
        try {
            const response = await api.post('/portfolio/portfolio-card/add-packet', newPacket);
            if (response.data.success) {
                fetchPortfolio();
                setIsAddingPacket(false);
                setNewPacket({
                    portfolio_id: Number(id),
                    index_id: availableIndexes[0]?.id || 0,
                    quantity: 1,
                    buy_date: new Date().toISOString().split('T')[0]
                });
            }
        } catch (error) {
            console.error("Ошибка при добавлении пакета:", error);
        }
    };

        const fetchPortfolio = async () => {
            try {
            const response = await api.get(`/portfolio/portfolio-card/${id}`, {
                params: { currency: selectedCurrency }
            });
                setPortfolio(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке портфеля:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePacket = async (packetId: number, indexName: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем всплытие события

        if (window.confirm(`Вы действительно хотите удалить пакет акций "${indexName}"?`)) {
            try {
                await api.delete('/portfolio/portfolio-card/delete-packet', {
                    data: { packet_id: packetId }
                });
                fetchPortfolio(); // Обновляем данные после удаления
                toast.success('Пакет акций успешно удален');
            } catch (error) {
                console.error("Ошибка при удалении пакета:", error);
                toast.error('Ошибка при удалении пакета');
            }
        }
    };

    const handleStartEditing = () => {
        setNewName(portfolio?.name || '');
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setIsEditing(false);
        setNewName('');
    };

    const handleSaveNewName = async () => {
        if (!portfolio || !newName.trim()) return;

        try {
            const response = await api.patch(`/portfolio/portfolio-card/update/${portfolio.id}`, {
                name: newName.trim()
            });
            
            if (response.data.success) {
                setPortfolio({ ...portfolio, name: response.data.name });
                toast.success('Название портфеля успешно изменено');
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Ошибка при переименовании портфеля:", error);
            toast.error('Ошибка при переименовании портфеля');
            }
        };

    const handleCalculatePrediction = async () => {
        if (!portfolio) return;
        
        setLoadingPrediction(true);
        try {
            const response = await api.get(`/portfolio/portfolio-card/${portfolio.id}/prediction`, {
                params: {
                    currency: selectedCurrency,
                    days: selectedPeriod.days
                }
            });
            setPrediction(response.data);
        } catch (error) {
            console.error("Ошибка при получении прогноза:", error);
            toast.error('Ошибка при расчете прогноза');
        } finally {
            setLoadingPrediction(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
        fetchAvailableIndexes();
        fetchAvailableCurrencies();
    }, [id]);

    useEffect(() => {
        if (selectedCurrency) {
            fetchPortfolio();
        }
    }, [selectedCurrency]);

    if (loading) {
        return <div className="loading-container">Загрузка...</div>;
    }

    if (!portfolio) {
        return <div className="error-container">Портфель не найден</div>;
    }

    return (
        <div className="market-page">
            <div className="portfolio-details-header">
                <div className="header-top">
                    {isEditing ? (
                        <div className="portfolio-name-edit">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="portfolio-name-input"
                                autoFocus
                            />
                            <div className="edit-buttons">
                                <button className="save-button" onClick={handleSaveNewName}>
                                    Сохранить
                                </button>
                                <button className="cancel-button" onClick={handleCancelEditing}>
                                    Отмена
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="portfolio-title">
                            <h1 className="title">{portfolio.name}</h1>
                            <button className="edit-button" onClick={handleStartEditing}>
                                ✎
                            </button>
                        </div>
                    )}
                    <div className="currency-selector">
                        <label>Валюта конвертации: </label>
                        <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            className="currency-select"
                        >
                            {availableCurrencies.map((curr) => (
                                <option key={curr} value={curr}>
                                    {curr}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="portfolio-summary">
                    <div className="summary-card">
                        <span className="label">Текущая стоимость</span>
                        <span className="value">{portfolio.currentValue.toFixed(2)} {portfolio.currency.symbol}</span>
                    </div>
                    <div className="summary-card prediction-card">
                        <span className="label">Прогноз стоимости</span>
                        <div className="prediction-controls">
                            <div className="period-selector">
                                <span>За период:</span>
                                <select
                                    value={selectedPeriod.days}
                                    onChange={(e) => setSelectedPeriod(
                                        predictionPeriods.find(p => p.days === Number(e.target.value)) || predictionPeriods[1]
                                    )}
                                    className="period-select"
                                >
                                    {predictionPeriods.map((period) => (
                                        <option key={period.days} value={period.days}>
                                            {period.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                className="calculate-button"
                                onClick={handleCalculatePrediction}
                                disabled={loadingPrediction}
                            >
                                {loadingPrediction ? 'Расчет...' : 'Рассчитать'}
                            </button>
                        </div>
                        <div className="prediction-result">
                            <div className="prediction-values">
                                <div className="prediction-value-block">
                                    <span className="prediction-label">Ожидаемая стоимость</span>
                                    {loadingPrediction ? (
                                        <span className="predicted-value loading">Загрузка...</span>
                                    ) : (
                                        <span className="predicted-value">
                                            {prediction ? 
                                                `${prediction.predicted_value.toFixed(2)} ${prediction.currency.symbol}` : 
                                                '—'
                                            }
                                        </span>
                                    )}
                                </div>
                                <div className="prediction-value-block">
                                    <span className="prediction-label">Ожидаемый рост</span>
                                    {loadingPrediction ? (
                                        <span className="growth loading">Загрузка...</span>
                                    ) : (
                                        <span className={`growth ${prediction && prediction.growth_percent >= 0 ? 'positive' : prediction ? 'negative' : ''}`}>
                                            {prediction ? 
                                                `${prediction.growth_percent >= 0 ? '+' : ''}${prediction.growth_percent.toFixed(2)}%` : 
                                                '—'
                                            }
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="summary-card">
                        <span className="label">Общая динамика</span>
                        <span className={`value ${portfolio.dynamicFromBuyDate >= 0 ? 'positive' : 'negative'}`}>
                            {portfolio.dynamicFromBuyDate >= 0 ? '+' : ''}{portfolio.dynamicFromBuyDate.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="packets-container">
                {/* Существующие пакеты */}
            {portfolio.packets.map((packet) => (
                    <div key={packet.id} className="packet-card">
                        <button
                            className="delete-button"
                            onClick={(e) => handleDeletePacket(packet.id, packet.index.indexName, e)}
                        >
                            ×
                        </button>
                        <div className="packet-header">
                            <h2>{packet.index.indexName} <span className="isin">({packet.index.indexISIN})</span></h2>
                            <span className={`dynamic ${packet.dynamicFromBuyDate >= 0 ? 'positive' : 'negative'}`}>
                                {packet.dynamicFromBuyDate >= 0 ? '+' : ''}{packet.dynamicFromBuyDate.toFixed(2)}%
                            </span>
                        </div>
                        
                        <div className="packet-details">
                            <div className="detail-row">
                                <div className="detail-item">
                                    <span className="label">Количество</span>
                                    <span className="value">{packet.quantity}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Валюта</span>
                                    <span className="value">{packet.currency.symbol}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Дата покупки</span>
                                    <span className="value">{new Date(packet.buyDate).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="detail-row">
                                <div className="detail-item">
                                    <span className="label">Цена покупки</span>
                                    <span className="value">{packet.initialPrice.toFixed(2)} {packet.currency.symbol}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Текущая цена</span>
                                    <span className="value">{packet.currentPrice.toFixed(2)} {packet.currency.symbol}</span>
                                </div>
                            </div>

                            <div className="detail-row">
                                <div className="detail-item">
                                    <span className="label">Начальная стоимость</span>
                                    <span className="value">{packet.initialConvertedPrice.toFixed(2)} {portfolio.currency.symbol}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Текущая стоимость</span>
                                    <span className="value">{packet.currentConvertedPrice.toFixed(2)} {portfolio.currency.symbol}</span>
                                </div>
                            </div>

                            <div className="monthly-dynamic">
                                <span className="label">Месячная динамика</span>
                                <span className={`value ${packet.index.monthlyDynamic >= 0 ? 'positive' : 'negative'}`}>
                                    {packet.index.monthlyDynamic >= 0 ? '+' : ''}{packet.index.monthlyDynamic.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                </div>
            ))}
                {/* Форма добавления нового пакета */}
                {isAddingPacket ? (
                    <div className="packet-card new-packet-form">
                        <div className="packet-header">
                            <h2>Новый пакет акций</h2>
                            <button className="close-button" onClick={() => setIsAddingPacket(false)}>×</button>
                        </div>
                        <div className="packet-details">
                            <div className="form-row">
                                <label className="label">Акция</label>
                                <select 
                                    value={newPacket.index_id}
                                    onChange={(e) => setNewPacket(prev => ({ ...prev, index_id: Number(e.target.value) }))}
                                    className="form-select"
                                >
                                    {availableIndexes.map(index => (
                                        <option key={index.id} value={index.id}>
                                            {index.indexName} ({index.indexISIN}) - {index.currency.symbol}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <label className="label">Количество</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newPacket.quantity}
                                    onChange={(e) => setNewPacket(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-row">
                                <label className="label">Дата покупки</label>
                                <input
                                    type="date"
                                    value={newPacket.buy_date}
                                    onChange={(e) => setNewPacket(prev => ({ ...prev, buy_date: e.target.value }))}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-actions">
                                <button className="cancel-button" onClick={() => setIsAddingPacket(false)}>
                                    Отмена
                                </button>
                                <button className="submit-button" onClick={handleAddPacket}>
                                    Добавить
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button className="add-packet-button" onClick={() => setIsAddingPacket(true)}>
                        + Добавить пакет акций
                    </button>
                )}
            </div>
        </div>
    );
};
