import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/portfolios.css';
import '../styles/portfolio-details.css';

interface Currency {
    id: number;
    currency: string;
    symbol: string;
    ticker: string;
}

interface Portfolio {
    id: number;
    name: string;
    currentValue: number;
    dynamic: number;
    dynamicFromBuyDate: number;
    convertedDynamicFromBuyDate: number;
    packets: any[];
    currency: Currency;
}

const PortfoliosPage: React.FC = () => {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [currency, setCurrency] = useState<Currency | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
    const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const navigate = useNavigate();

    const handleCreatePortfolio = async () => {
        try {
            const response = await api.post('/portfolio/create-portfolio', {
                name: newPortfolioName
            });
            // После успешного создания переходим на страницу нового портфеля
            navigate(`/portfolio/${response.data.id}`);
        } catch (error) {
            console.error('Ошибка при создании портфеля:', error);
            toast.error('Ошибка при создании портфеля');
        }
    };

    const handleDeletePortfolio = async (portfolioId: number, portfolioName: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Предотвращаем переход на страницу портфеля

        if (window.confirm(`Вы действительно хотите удалить портфель "${portfolioName}"?`)) {
            try {
                await api.delete(`/portfolio/portfolio-card/${portfolioId}`);
                setPortfolios(portfolios.filter(p => p.id !== portfolioId));
                toast.success('Портфель успешно удален');
            } catch (error) {
                console.error('Ошибка при удалении портфеля:', error);
                toast.error('Ошибка при удалении портфеля');
            }
        }
    };

    const fetchCurrencies = async () => {
        try {
            const res = await api.get('/fixings/all-currencies-names');
            setAvailableCurrencies(res.data);
        } catch (error) {
            console.error('Ошибка загрузки списка валют', error);
            toast.error('Ошибка при загрузке списка валют');
        }
    };

    useEffect(() => {
        fetchCurrencies();
    }, []);

    useEffect(() => {
        const fetchPortfolios = async () => {
            setLoading(true);
            try {
                const params = { currency: selectedCurrency };
                const res = await api.get('/portfolio/list', { params });
                setPortfolios(res.data.portfolios);
                setCurrency(res.data.currency);
            } catch (error) {
                console.error('Ошибка загрузки портфелей', error);
                toast.error('Ошибка при загрузке портфелей');
            } finally {
                setLoading(false);
            }
        };
        fetchPortfolios();
    }, [selectedCurrency]);

    return (
        <div className="market-page">
            <div className="portfolio-details-header">
                <div className="header-top">
            <h1 className="title">Мои портфели</h1>
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
            </div>

            {loading ? (
                <p>Загрузка...</p>
            ) : (
                <>
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                    {portfolios.map((p) => (
                        <div
                            key={p.id}
                            className="portfolio-card"
                            onClick={() => navigate(`/portfolio/${p.id}`)}
                        >
                                <button
                                    className="delete-button"
                                    onClick={(e) => handleDeletePortfolio(p.id, p.name, e)}
                                >
                                    ×
                                </button>
                                <div className="portfolio-header">
                            <h3>{p.name}</h3>
                                </div>
                                <p>Стоимость: {currency?.symbol}{p.currentValue.toFixed(2)}</p>
                            <p style={{ color: p.dynamic >= 0 ? 'green' : 'red' }}>
                                {p.dynamic >= 0 ? '+' : ''}{p.dynamic.toFixed(2)}%
                            </p>
                        </div>
                    ))}
                        
                        {/* Кнопка добавления нового портфеля */}
                        {!isAddingPortfolio ? (
                            <div
                                className="portfolio-card add-portfolio"
                                onClick={() => setIsAddingPortfolio(true)}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <h3>+ Добавить портфель</h3>
                            </div>
                        ) : (
                            <div className="portfolio-card add-portfolio-form">
                                <input
                                    type="text"
                                    value={newPortfolioName}
                                    onChange={(e) => setNewPortfolioName(e.target.value)}
                                    placeholder="Название портфеля"
                                    className="portfolio-name-input"
                                />
                                <div className="button-group">
                                    <button
                                        onClick={handleCreatePortfolio}
                                        className="create-button"
                                    >
                                        Создать
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsAddingPortfolio(false);
                                            setNewPortfolioName('');
                                        }}
                                        className="cancel-button"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        )}
                </div>
                </>
            )}
            <ToastContainer
                position="bottom-left"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />
        </div>
    );
};

export default PortfoliosPage;
