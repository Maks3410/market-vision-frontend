import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/client";
import { useCalculationEvents } from "../realtime/CalculationEventsContext";
import "../styles/portfolio-details.css";

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

type CalculationSummary = {
    id: number;
    status: string;
    startDateTime: string;
    endDateTime: string | null;
    portfolioId: number;
};

type Portfolio = {
    id: number;
    name: string;
    currentValue: number;
    dynamicFromBuyDate: number;
    convertedDynamicFromBuyDate: number;
    currency: Currency;
    packets: Packet[];
    latestCalculation: CalculationSummary | null;
};

type PredictionResponse = {
    calculation_id: number;
    status: string;
};

type CalculationSocketEvent = {
    event: string;
    calculation?: CalculationSummary;
    error?: string;
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
    { label: "5 лет", days: 1825 },
];

interface NewPacket {
    portfolio_id: number;
    index_id: number;
    quantity: number;
    buy_date: string;
}

const extractFilenameFromDisposition = (contentDisposition?: string) => {
    if (!contentDisposition) {
        return null;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || null;
};

export const PortfolioDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [availableIndexes, setAvailableIndexes] = useState<Index[]>([]);
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
    const [selectedCurrency, setSelectedCurrency] = useState("USD");
    const [isAddingPacket, setIsAddingPacket] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<PredictionPeriod>(predictionPeriods[1]);
    const [loadingPrediction, setLoadingPrediction] = useState(false);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const [activeCalculationId, setActiveCalculationId] = useState<number | null>(null);
    const [newPacket, setNewPacket] = useState<NewPacket>({
        portfolio_id: Number(id),
        index_id: 0,
        quantity: 1,
        buy_date: new Date().toISOString().split("T")[0],
    });
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState("");
    const { isConnected, lastEvent } = useCalculationEvents() as {
        isConnected: boolean;
        lastEvent: CalculationSocketEvent | null;
    };

    const fetchAvailableCurrencies = async () => {
        try {
            const response = await api.get("/fixings/all-currencies-names");
            setAvailableCurrencies(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке списка валют:", error);
        }
    };

    const fetchAvailableIndexes = async () => {
        try {
            const response = await api.get("/fixings/all-indexes");
            setAvailableIndexes(response.data);
            if (response.data.length > 0) {
                setNewPacket((prev) => ({ ...prev, index_id: response.data[0].id }));
            }
        } catch (error) {
            console.error("Ошибка при загрузке списка акций:", error);
        }
    };

    const fetchPortfolio = useCallback(async () => {
        try {
            const response = await api.get(`/portfolio/portfolio-card/${id}`, {
                params: { currency: selectedCurrency },
            });
            setPortfolio(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке портфеля:", error);
        } finally {
            setLoading(false);
        }
    }, [id, selectedCurrency]);

    const handleAddPacket = async () => {
        try {
            const response = await api.post("/portfolio/portfolio-card/add-packet", newPacket);
            if (response.data.success) {
                await fetchPortfolio();
                setIsAddingPacket(false);
                setNewPacket({
                    portfolio_id: Number(id),
                    index_id: availableIndexes[0]?.id || 0,
                    quantity: 1,
                    buy_date: new Date().toISOString().split("T")[0],
                });
            }
        } catch (error) {
            console.error("Ошибка при добавлении пакета:", error);
        }
    };

    const handleDeletePacket = async (packetId: number, indexName: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (window.confirm(`Вы действительно хотите удалить пакет акций "${indexName}"?`)) {
            try {
                await api.delete("/portfolio/portfolio-card/delete-packet", {
                    data: { packet_id: packetId },
                });
                await fetchPortfolio();
                toast.success("Пакет акций успешно удален");
            } catch (error) {
                console.error("Ошибка при удалении пакета:", error);
                toast.error("Ошибка при удалении пакета");
            }
        }
    };

    const handleStartEditing = () => {
        setNewName(portfolio?.name || "");
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setIsEditing(false);
        setNewName("");
    };

    const handleSaveNewName = async () => {
        if (!portfolio || !newName.trim()) {
            return;
        }

        try {
            const response = await api.patch(`/portfolio/portfolio-card/update/${portfolio.id}`, {
                name: newName.trim(),
            });

            if (response.data.success) {
                setPortfolio({ ...portfolio, name: response.data.name });
                toast.success("Название портфеля успешно изменено");
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Ошибка при переименовании портфеля:", error);
            toast.error("Ошибка при переименовании портфеля");
        }
    };

    const handleCalculatePrediction = async () => {
        if (!portfolio) {
            return;
        }

        setLoadingPrediction(true);
        try {
            const response = await api.post<PredictionResponse>(
                `/portfolio/portfolio-card/${portfolio.id}/prediction`,
                {
                    currency: selectedCurrency,
                    days: selectedPeriod.days,
                },
            );

            const plannedCalculation: CalculationSummary = {
                id: response.data.calculation_id,
                status: response.data.status,
                startDateTime: new Date().toISOString(),
                endDateTime: null,
                portfolioId: portfolio.id,
            };

            setActiveCalculationId(response.data.calculation_id);
            setPortfolio((prev) =>
                prev
                    ? {
                          ...prev,
                          latestCalculation: plannedCalculation,
                      }
                    : prev,
            );
            toast.info("Расчет поставлен в очередь. Статус обновится автоматически.");
        } catch (error) {
            console.error("Ошибка при получении прогноза:", error);
            toast.error("Ошибка при запуске расчета");
            setLoadingPrediction(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!portfolio) {
            return;
        }

        setIsDownloadingReport(true);
        try {
            const response = await api.get(`/portfolio/portfolio-card/${portfolio.id}/report`, {
                params: { currency: selectedCurrency },
                responseType: "blob",
            });

            const fileName =
                extractFilenameFromDisposition(response.headers["content-disposition"]) ||
                `portfolio-${portfolio.id}-report.pdf`;
            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("PDF-отчет успешно сформирован");
        } catch (error) {
            console.error("Ошибка при формировании отчета:", error);
            toast.error("Не удалось сформировать PDF-отчет");
        } finally {
            setIsDownloadingReport(false);
        }
    };

    useEffect(() => {
        fetchAvailableIndexes();
        fetchAvailableCurrencies();
    }, [id]);

    useEffect(() => {
        if (selectedCurrency) {
            fetchPortfolio();
        }
    }, [fetchPortfolio, selectedCurrency]);

    useEffect(() => {
        if (!portfolio || !lastEvent?.calculation) {
            return;
        }

        if (lastEvent.event !== "calculation_status" || lastEvent.calculation.portfolioId !== portfolio.id) {
            return;
        }

        setPortfolio((prev) =>
            prev
                ? {
                      ...prev,
                      latestCalculation: lastEvent.calculation || prev.latestCalculation,
                  }
                : prev,
        );

        if (lastEvent.calculation.id !== activeCalculationId) {
            return;
        }

        if (lastEvent.calculation.status === "IN_PROCESS") {
            toast.info("Расчет начался.");
            return;
        }

        if (lastEvent.calculation.status === "CALCULATED") {
            setLoadingPrediction(false);
            setActiveCalculationId(null);
            navigate(`/portfolio/${portfolio.id}/calculations/${lastEvent.calculation.id}`);
            return;
        }

        if (lastEvent.calculation.status === "ERROR") {
            setLoadingPrediction(false);
            setActiveCalculationId(null);
            toast.error(lastEvent.error || "Расчет завершился с ошибкой.");
        }
    }, [activeCalculationId, lastEvent, navigate, portfolio]);

    if (loading) {
        return <div className="loading-container">Загрузка...</div>;
    }

    if (!portfolio) {
        return <div className="error-container">Портфель не найден</div>;
    }

    const latestCalculationDate = portfolio.latestCalculation?.endDateTime || portfolio.latestCalculation?.startDateTime;

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
                    <div className="portfolio-actions">
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
                        <button
                            className="report-button"
                            onClick={handleDownloadReport}
                            disabled={isDownloadingReport}
                        >
                            {isDownloadingReport ? "Готовим PDF..." : "Скачать PDF-отчет"}
                        </button>
                    </div>
                </div>
                <div className="portfolio-summary">
                    <div className="summary-card">
                        <span className="label">Текущая стоимость</span>
                        <span className="value">
                            {portfolio.currentValue.toFixed(2)} {portfolio.currency.symbol}
                        </span>
                    </div>
                    <div className="summary-card prediction-card">
                        <span className="label">Monte Carlo симуляция</span>
                        <div className="socket-status-row">
                            <span className={`socket-indicator ${isConnected ? "online" : "offline"}`} />
                            <span className="socket-status-text">
                                {isConnected ? "Живой канал статусов подключен" : "Канал статусов переподключается"}
                            </span>
                        </div>
                        <div className="prediction-controls">
                            <div className="period-selector">
                                <span>За период:</span>
                                <select
                                    value={selectedPeriod.days}
                                    onChange={(e) =>
                                        setSelectedPeriod(
                                            predictionPeriods.find((period) => period.days === Number(e.target.value)) ||
                                                predictionPeriods[1],
                                        )
                                    }
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
                                {loadingPrediction ? "В очереди..." : "Рассчитать"}
                            </button>
                        </div>
                        <div className="prediction-result prediction-description">
                            <span className="prediction-label">Что войдет в результат</span>
                            <p>
                                Доходность, вероятность прибыли, волатильность, Value at Risk, Conditional Value at
                                Risk и оптимальный горизонт удержания на отдельной странице с полным разбором.
                            </p>
                        </div>
                    </div>
                    <div className="summary-card">
                        <span className="label">Общая динамика</span>
                        <span className={`value ${portfolio.dynamicFromBuyDate >= 0 ? "positive" : "negative"}`}>
                            {portfolio.dynamicFromBuyDate >= 0 ? "+" : ""}
                            {portfolio.dynamicFromBuyDate.toFixed(2)}%
                        </span>
                    </div>
                </div>
                <button
                    className={`latest-calculation-card ${portfolio.latestCalculation ? "is-clickable" : "is-empty"}`}
                    onClick={() => {
                        if (portfolio.latestCalculation) {
                            navigate(`/portfolio/${portfolio.id}/calculations/${portfolio.latestCalculation.id}`);
                        }
                    }}
                    disabled={!portfolio.latestCalculation}
                >
                    <div className="latest-calculation-copy">
                        <span className="label">Последний расчет</span>
                        {portfolio.latestCalculation ? (
                            <>
                                <strong>Результат #{portfolio.latestCalculation.id}</strong>
                                <span className="latest-calculation-meta">
                                    Статус: {portfolio.latestCalculation.status}
                                </span>
                                {portfolio.latestCalculation.id === activeCalculationId && (
                                    <span className="latest-calculation-meta latest-calculation-live">
                                        Обновляется в реальном времени
                                    </span>
                                )}
                                <span className="latest-calculation-meta">
                                    {latestCalculationDate
                                        ? `Обновлено ${new Date(latestCalculationDate).toLocaleString()}`
                                        : "Дата временно недоступна"}
                                </span>
                            </>
                        ) : (
                            <>
                                <strong>Расчетов пока нет</strong>
                                <span className="latest-calculation-meta">
                                    Запустите первую симуляцию, чтобы открыть сохраненный результат в один клик.
                                </span>
                            </>
                        )}
                    </div>
                    <span className="latest-calculation-arrow">
                        {portfolio.latestCalculation ? "Открыть" : "Ждет первый запуск"}
                    </span>
                </button>
            </div>

            <div className="packets-container">
                {portfolio.packets.map((packet) => (
                    <div key={packet.id} className="packet-card">
                        <button
                            className="delete-button"
                            onClick={(e) => handleDeletePacket(packet.id, packet.index.indexName, e)}
                        >
                            ×
                        </button>
                        <div className="packet-header">
                            <h2>
                                {packet.index.indexName} <span className="isin">({packet.index.indexISIN})</span>
                            </h2>
                            <span className={`dynamic ${packet.dynamicFromBuyDate >= 0 ? "positive" : "negative"}`}>
                                {packet.dynamicFromBuyDate >= 0 ? "+" : ""}
                                {packet.dynamicFromBuyDate.toFixed(2)}%
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
                                    <span className="value">
                                        {packet.initialPrice.toFixed(2)} {packet.currency.symbol}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Текущая цена</span>
                                    <span className="value">
                                        {packet.currentPrice.toFixed(2)} {packet.currency.symbol}
                                    </span>
                                </div>
                            </div>

                            <div className="detail-row">
                                <div className="detail-item">
                                    <span className="label">Начальная стоимость</span>
                                    <span className="value">
                                        {packet.initialConvertedPrice.toFixed(2)} {portfolio.currency.symbol}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Текущая стоимость</span>
                                    <span className="value">
                                        {packet.currentConvertedPrice.toFixed(2)} {portfolio.currency.symbol}
                                    </span>
                                </div>
                            </div>

                            <div className="monthly-dynamic">
                                <span className="label">Месячная динамика</span>
                                <span className={`value ${packet.index.monthlyDynamic >= 0 ? "positive" : "negative"}`}>
                                    {packet.index.monthlyDynamic >= 0 ? "+" : ""}
                                    {packet.index.monthlyDynamic.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {isAddingPacket ? (
                    <div className="packet-card new-packet-form">
                        <div className="packet-header">
                            <h2>Новый пакет акций</h2>
                            <button className="close-button" onClick={() => setIsAddingPacket(false)}>
                                ×
                            </button>
                        </div>
                        <div className="packet-details">
                            <div className="form-row">
                                <label className="label">Акция</label>
                                <select
                                    value={newPacket.index_id}
                                    onChange={(e) =>
                                        setNewPacket((prev) => ({ ...prev, index_id: Number(e.target.value) }))
                                    }
                                    className="form-select"
                                >
                                    {availableIndexes.map((index) => (
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
                                    onChange={(e) =>
                                        setNewPacket((prev) => ({ ...prev, quantity: Number(e.target.value) }))
                                    }
                                    className="form-input"
                                />
                            </div>
                            <div className="form-row">
                                <label className="label">Дата покупки</label>
                                <input
                                    type="date"
                                    value={newPacket.buy_date}
                                    onChange={(e) =>
                                        setNewPacket((prev) => ({ ...prev, buy_date: e.target.value }))
                                    }
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
