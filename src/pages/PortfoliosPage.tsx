import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/portfolios.css';


interface Portfolio {
    id: number;
    name: string;
    currency: { code: string; symbol: string };
    currentValue: number;
    dynamic: number;
}

const PortfoliosPage: React.FC = () => {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPortfolios = async () => {
            setLoading(true);
            try {
                const params = selectedCurrency ? { currency: selectedCurrency } : {};
                const res = await api.get('/portfolio/list', { params });
                setPortfolios(res.data);
            } catch (error) {
                console.error('Ошибка загрузки портфелей', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPortfolios();
    }, [selectedCurrency]);

    return (
        <div className="market-page">
            <h1 className="title">Мои портфели</h1>

            <div style={{ marginBottom: '1rem' }}>
                <label>Фильтр по валюте: </label>
                <select
                    value={selectedCurrency || ''}
                    onChange={(e) => setSelectedCurrency(e.target.value || null)}
                >
                    <option value="">Все</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                </select>
            </div>

            {loading ? (
                <p>Загрузка...</p>
            ) : (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {portfolios.map((p) => (
                        <div
                            key={p.id}
                            className="portfolio-card"
                            onClick={() => navigate(`/portfolio/${p.id}`)}
                        >
                            <h3>{p.name}</h3>
                            <p>Стоимость: {p.currentValue.toFixed(2)}</p>
                            <p style={{ color: p.dynamic >= 0 ? 'green' : 'red' }}>
                                {p.dynamic >= 0 ? '+' : ''}{p.dynamic.toFixed(2)}%
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PortfoliosPage;
