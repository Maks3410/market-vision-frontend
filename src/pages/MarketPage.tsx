import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { StockIndex, CurrencyRate } from '../types';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { RefreshCw } from 'lucide-react';
import '../styles/market.css';
import { motion, AnimatePresence } from 'framer-motion';

const MarketPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'stocks' | 'currencies'>('stocks');
    const [stocks, setStocks] = useState<StockIndex[]>([]);
    const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [lastUpdate, setLastUpdate] = useState('Не определено');

    const buildQueryParams = () => {
        const params: Record<string, string | number> = {
            page: currentPage,
        };
        if (sortField && sortDirection) {
            params.ordering = `${sortDirection === 'desc' ? '-' : ''}${sortField}`;
        }
        return params;
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = buildQueryParams();
                if (activeTab === 'stocks') {
                    const res = await api.get('/fixings/indexes/', { params });
                    setStocks(res.data.results);
                    setTotalPages(Math.ceil(res.data.count / res.data.pageSize));
                    setLastUpdate(res.data.lastUpdate);
                } else {
                    const res = await api.get('/fixings/currencies/', { params });
                    setCurrencies(res.data.results);
                    setTotalPages(Math.ceil(res.data.count / res.data.pageSize));
                    setLastUpdate(res.data.lastUpdate);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab, sortField, sortDirection, currentPage]);

    useEffect(() => {
        setSortField(null);
        setSortDirection(null);
        setCurrentPage(1);
    }, [activeTab]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            if (sortDirection === 'asc') setSortDirection('desc');
            else if (sortDirection === 'desc') {
                setSortField(null);
                setSortDirection(null);
            } else setSortDirection('asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/fixings/update-info');
            const { countCurrencies, countIndexes, startDate, endDate, warning } = response.data;

            const params = buildQueryParams();
            if (activeTab === 'stocks') {
                const res = await api.get('/fixings/indexes/', { params });
                setStocks(res.data.results);
                setTotalPages(Math.ceil(res.data.count / res.data.pageSize));
            } else {
                const res = await api.get('/fixings/currencies/', { params });
                setCurrencies(res.data.results);
                setTotalPages(Math.ceil(res.data.count / res.data.pageSize));
            }

            if (endDate) {
                setLastUpdate(endDate);
            }

            if (warning) {
                toast.warning(warning);
            } else {
                toast.success(`Загружены данные с ${startDate} по ${endDate}: ${countIndexes} акций и ${countCurrencies} валют`);
            }
        } catch (e) {
            toast.error('Ошибка при обновлении данных');
        } finally {
            setRefreshing(false);
        }
    };


    const renderTable = () => (
        <table className="market-table">
            <AnimatePresence mode="wait">
                <motion.thead
                    key={activeTab}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.25 }}
                >
                    <tr>
                        <th onClick={() => handleSort(activeTab === 'stocks' ? 'indexName' : 'currency')}>
                            {activeTab === 'stocks' ? 'Название' : 'Валюта'} {sortField === (activeTab === 'stocks' ? 'indexName' : 'currency') ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th onClick={() => handleSort(activeTab === 'stocks' ? 'indexISIN' : 'ticker')}>
                            {activeTab === 'stocks' ? 'ISIN' : 'Тикер'} {sortField === (activeTab === 'stocks' ? 'indexISIN' : 'ticker') ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th>Цена</th>
                        <th onClick={() => handleSort('currentUSDPrice')}>
                            Цена в USD {sortField === 'currentUSDPrice' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th onClick={() => handleSort('monthlyDynamic')} style={{ textAlign: 'right' }}>
                            Динамика {sortField === 'monthlyDynamic' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                    </tr>
                </motion.thead>
            </AnimatePresence>
            <AnimatePresence mode="wait">
                <motion.tbody
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                >
                    {activeTab === 'stocks'
                        ? stocks.map((stock) => (
                            <tr key={stock.id}>
                                <td>{stock.indexName}</td>
                                <td>{stock.indexISIN}</td>
                                <td>{stock.currentPrice} {stock.currency.symbol}</td>
                                <td>{stock.currentUSDPrice}</td>
                                <td style={{ color: stock.monthlyDynamic >= 0 ? 'green' : 'red', textAlign: 'right' }}>
                                    {stock.monthlyDynamic > 0 ? '+' : ''}
                                    {stock.monthlyDynamic}%
                                </td>
                            </tr>
                        ))
                        : currencies.map((cur) => (
                            <tr key={cur.id}>
                                <td>{cur.symbol} {cur.currency}</td>
                                <td>{cur.ticker}</td>
                                <td>—</td>
                                <td>{cur.currentUSDPrice}</td>
                                <td style={{ color: cur.monthlyDynamic >= 0 ? 'green' : 'red', textAlign: 'right' }}>
                                    {cur.monthlyDynamic > 0 ? '+' : ''}
                                    {cur.monthlyDynamic}%
                                </td>
                            </tr>
                        ))}
                </motion.tbody>
            </AnimatePresence>
        </table>
    );

    return (
        <div className="market-page">
            <h1 className="title">Состояние рынка</h1>
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'stocks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stocks')}
                >
                    Цены акций
                </button>
                <button
                    className={`tab ${activeTab === 'currencies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('currencies')}
                >
                    Цены валют
                </button>
            </div>

            <div className="table-wrapper">
                <div className="table-header">
                    <h2>Данные: {activeTab === 'stocks' ? 'акции' : 'валюты'}</h2>
                    <p>Дата последнего фиксинга:<br />{lastUpdate}</p>
                    <button
                        className="refresh-button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        {refreshing ? <RefreshCw className="spinner" size={16} /> : <RefreshCw size={16} />}
                        <span style={{ marginLeft: 6 }}>Обновить информацию</span>
                    </button>
                </div>

                <div className="table-container">
                    {loading ? <p>Загрузка...</p> : renderTable()}
                </div>

                <div className="pagination">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                            key={pageNum}
                            className={pageNum === currentPage ? 'active' : ''}
                            onClick={() => setCurrentPage(pageNum)}
                        >
                            {pageNum}
                        </button>
                    ))}
                </div>
            </div>

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

export default MarketPage;
