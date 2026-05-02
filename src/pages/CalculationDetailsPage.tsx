import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import "../styles/calculation-details.css";
import "../styles/portfolio-details.css";

const CHART_WIDTH = 760;
const CHART_HEIGHT = 320;
const CHART_MARGIN = { top: 18, right: 20, bottom: 44, left: 82 };

type ProjectionPoint = {
    days: number;
    date: string;
    expected_return: number;
    volatility: number;
    expected_value: number;
    volatility_amount: number;
    upper_value: number;
    lower_value: number;
};

type CalculationResults = {
    currency_code: string;
    requested_horizon_days: number;
    portfolio_value: number;
    expected_profit: number;
    expected_value: number;
    probability_of_profit: number;
    volatility: number;
    volatility_amount: number;
    value_at_risk: number;
    value_at_risk_amount: number;
    conditional_value_at_risk: number;
    conditional_value_at_risk_amount: number;
    optimal_holding_period: number;
    stable_range: [number, number];
    expected_profit_at_ohp: number;
    expected_value_at_ohp: number;
    probability_of_profit_at_ohp: number;
    volatility_at_ohp: number;
    volatility_amount_at_ohp: number;
    projection_points: ProjectionPoint[];
};

type CalculationResponse = {
    id: number;
    status: string;
    startDateTime: string;
    endDateTime: string | null;
    results: CalculationResults | null;
};

const formatPercent = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
const formatMoney = (value: number, currencyCode: string) =>
    new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2,
    }).format(value);
const formatDays = (value: number) => `${value} дн.`;
const formatRange = (range: [number, number]) => `${range[0]}-${range[1]} дн.`;

const metricTone = (value: number, inverted = false) => {
    if (value === 0) {
        return "";
    }
    const positive = inverted ? value < 0 : value > 0;
    return positive ? "positive" : "negative";
};

const buildLinePath = (
    points: ProjectionPoint[],
    accessor: (point: ProjectionPoint, index: number) => { x: number; y: number },
) => {
    if (points.length === 0) {
        return "";
    }

    return points
        .map((point, index) => {
            const { x, y } = accessor(point, index);
            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
};

export const CalculationDetailsPage: React.FC = () => {
    const navigate = useNavigate();
    const { portfolioId, calculationId } = useParams<{ portfolioId: string; calculationId: string }>();
    const [calculation, setCalculation] = useState<CalculationResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCalculation = async () => {
            try {
                const response = await api.get<CalculationResponse>(`/portfolio/calculations/${calculationId}`);
                setCalculation(response.data);
            } catch (error) {
                console.error("Ошибка при загрузке расчета:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCalculation();
    }, [calculationId]);

    const chartData = useMemo(() => calculation?.results?.projection_points ?? [], [calculation]);
    const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
    const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;

    const chartScale = useMemo(() => {
        if (chartData.length === 0) {
            return null;
        }

        const allValues = chartData.flatMap((point) => [point.lower_value, point.expected_value, point.upper_value]);
        const rawMax = Math.max(...allValues);
        const positiveRange = Math.max(rawMax, 1);
        const padding = Math.max(positiveRange * 0.08, 1);
        const minValue = 0;
        const maxValue = rawMax + padding;
        const valueRange = maxValue - minValue || 1;

        const scaleX = (index: number) =>
            CHART_MARGIN.left + (index / Math.max(chartData.length - 1, 1)) * plotWidth;
        const scaleY = (value: number) => {
            const clampedValue = Math.max(value, minValue);
            return CHART_MARGIN.top + (1 - (clampedValue - minValue) / valueRange) * plotHeight;
        };

        const yTicks = [maxValue, maxValue / 2, minValue];
        const xTickIndexes = Array.from(
            new Set([0, Math.floor((chartData.length - 1) / 2), chartData.length - 1].filter((index) => index >= 0)),
        );

        return { scaleX, scaleY, yTicks, xTickIndexes };
    }, [chartData, plotHeight, plotWidth]);

    const expectedPath = useMemo(() => {
        if (!chartScale) {
            return "";
        }
        return buildLinePath(chartData, (point, index) => ({
            x: chartScale.scaleX(index),
            y: chartScale.scaleY(point.expected_value),
        }));
    }, [chartData, chartScale]);

    const upperPath = useMemo(() => {
        if (!chartScale) {
            return "";
        }
        return buildLinePath(chartData, (point, index) => ({
            x: chartScale.scaleX(index),
            y: chartScale.scaleY(point.upper_value),
        }));
    }, [chartData, chartScale]);

    const lowerPath = useMemo(() => {
        if (!chartScale) {
            return "";
        }
        return buildLinePath(chartData, (point, index) => ({
            x: chartScale.scaleX(index),
            y: chartScale.scaleY(point.lower_value),
        }));
    }, [chartData, chartScale]);

    const insights = useMemo(() => {
        if (!calculation?.results) {
            return [];
        }

        const result = calculation.results;
        return [
            {
                title: "На запрошенный срок",
                text:
                    result.expected_profit >= 0
                        ? `К концу ${formatDays(result.requested_horizon_days)} модель ожидает среднюю стоимость около ${formatMoney(result.expected_value, result.currency_code)}.`
                        : `К концу ${formatDays(result.requested_horizon_days)} модель ожидает среднюю стоимость около ${formatMoney(result.expected_value, result.currency_code)} со снижением от текущего уровня.`,
            },
            {
                title: "Риск на этом горизонте",
                text:
                    result.volatility < 0.15
                        ? `На горизонте ${formatDays(result.requested_horizon_days)} разброс сценариев умеренный: типичное отклонение около ${formatMoney(result.volatility_amount, result.currency_code)}.`
                        : `На горизонте ${formatDays(result.requested_horizon_days)} разброс сценариев уже заметный: типичное отклонение около ${formatMoney(result.volatility_amount, result.currency_code)}.`,
            },
            {
                title: "Что означает OHP",
                text: `Оптимальный горизонт ${formatDays(result.optimal_holding_period)} и стабильный диапазон ${formatRange(result.stable_range)} относятся к отдельному долгосрочному поиску лучшего баланса доходности и риска, а не к вашему исходному сроку.`,
            },
        ];
    }, [calculation]);

    if (loading) {
        return <div className="loading-container">Загрузка результата...</div>;
    }

    if (!calculation || !calculation.results) {
        return <div className="error-container">Результат расчета недоступен</div>;
    }

    const result = calculation.results;

    return (
        <div className="market-page">
            <div className="calculation-page">
                <div className="calculation-hero">
                    <div className="calculation-hero-copy">
                        <button className="back-link-button" onClick={() => navigate(`/portfolio/${portfolioId}`)}>
                            ← Назад к портфелю
                        </button>
                        <span className="calculation-eyebrow">Сохраненный результат Monte Carlo</span>
                        <h1 className="title">Расчет #{calculation.id}</h1>
                        <p className="calculation-subtitle">
                            Вверху собраны метрики именно на запрошенный вами срок, а ниже отдельно показан
                            долгосрочный анализ модели для поиска оптимального горизонта удержания.
                        </p>
                    </div>
                    <div className="calculation-status-card">
                        <span className="label">Статус</span>
                        <strong>{calculation.status}</strong>
                        <span className="latest-calculation-meta">Валюта расчета: {result.currency_code}</span>
                        <span className="latest-calculation-meta">
                            Запрошенный горизонт: {formatDays(result.requested_horizon_days)}
                        </span>
                        <span className="latest-calculation-meta">
                            Стартовая стоимость: {formatMoney(result.portfolio_value, result.currency_code)}
                        </span>
                        <span className="latest-calculation-meta">
                            Запущен {new Date(calculation.startDateTime).toLocaleString()}
                        </span>
                        <span className="latest-calculation-meta">
                            Завершен {calculation.endDateTime ? new Date(calculation.endDateTime).toLocaleString() : "еще не завершен"}
                        </span>
                    </div>
                </div>

                <div className="calculation-grid">
                    <section className="calculation-panel calculation-panel-wide">
                        <div className="calculation-panel-header">
                            <span className="label">Запрошенный период</span>
                            <h2>Результат на горизонте {formatDays(result.requested_horizon_days)}</h2>
                            <p className="section-note">
                                Эти показатели относятся только к сроку, который вы указали при запуске расчета.
                            </p>
                        </div>
                        <div className="metric-grid">
                            <div className="metric-card">
                                <span className="metric-label">Ожидаемая доходность</span>
                                <strong className={metricTone(result.expected_profit)}>{formatPercent(result.expected_profit)}</strong>
                                <small>{formatMoney(result.expected_value, result.currency_code)}</small>
                            </div>
                            <div className="metric-card">
                                <span className="metric-label">Вероятность прибыли</span>
                                <strong className={metricTone(result.probability_of_profit - 0.5)}>
                                    {formatPercent(result.probability_of_profit)}
                                </strong>
                                <small>шанс завершить период в плюсе</small>
                            </div>
                            <div className="metric-card">
                                <span className="metric-label">Волатильность</span>
                                <strong>{formatPercent(result.volatility)}</strong>
                                <small>{formatMoney(result.volatility_amount, result.currency_code)}</small>
                            </div>
                            <div className="metric-card">
                                <span className="metric-label">Ожидаемая стоимость</span>
                                <strong>{formatMoney(result.expected_value, result.currency_code)}</strong>
                                <small>от текущих {formatMoney(result.portfolio_value, result.currency_code)}</small>
                            </div>
                        </div>
                    </section>

                    <section className="calculation-panel">
                        <div className="calculation-panel-header">
                            <span className="label">Риск на период</span>
                            <h2>Защитные метрики на {formatDays(result.requested_horizon_days)}</h2>
                        </div>
                        <div className="risk-list">
                            <div className="risk-row">
                                <span>Value at Risk (VaR)</span>
                                <div className="risk-values">
                                    <strong className={metricTone(result.value_at_risk, true)}>{formatPercent(result.value_at_risk)}</strong>
                                    <small>{formatMoney(result.value_at_risk_amount, result.currency_code)}</small>
                                </div>
                            </div>
                            <div className="risk-row">
                                <span>Conditional VaR</span>
                                <div className="risk-values">
                                    <strong className={metricTone(result.conditional_value_at_risk, true)}>
                                        {formatPercent(result.conditional_value_at_risk)}
                                    </strong>
                                    <small>{formatMoney(result.conditional_value_at_risk_amount, result.currency_code)}</small>
                                </div>
                            </div>
                            <div className="risk-row">
                                <span>Вероятность прибыли</span>
                                <div className="risk-values">
                                    <strong className={metricTone(result.probability_of_profit - 0.5)}>
                                        {formatPercent(result.probability_of_profit)}
                                    </strong>
                                    <small>для горизонта {formatDays(result.requested_horizon_days)}</small>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="calculation-panel">
                        <div className="calculation-panel-header">
                            <span className="label">Долгосрочный оптимум</span>
                            <h2>Оптимальный горизонт модели</h2>
                            <p className="section-note">
                                Этот блок не про ваш исходный срок. Он показывает, на каком длинном горизонте модель
                                видит лучший баланс доходности и риска.
                            </p>
                        </div>
                        <div className="risk-list">
                            <div className="risk-row risk-row-highlight">
                                <span>Оптимальный горизонт (OHP)</span>
                                <div className="risk-values">
                                    <strong>{formatDays(result.optimal_holding_period)}</strong>
                                    <small>стабильный диапазон: {formatRange(result.stable_range)}</small>
                                </div>
                            </div>
                            <div className="risk-row">
                                <span>Доходность на OHP</span>
                                <div className="risk-values">
                                    <strong className={metricTone(result.expected_profit_at_ohp)}>
                                        {formatPercent(result.expected_profit_at_ohp)}
                                    </strong>
                                    <small>{formatMoney(result.expected_value_at_ohp, result.currency_code)}</small>
                                </div>
                            </div>
                            <div className="risk-row">
                                <span>Вероятность прибыли на OHP</span>
                                <div className="risk-values">
                                    <strong className={metricTone(result.probability_of_profit_at_ohp - 0.5)}>
                                        {formatPercent(result.probability_of_profit_at_ohp)}
                                    </strong>
                                    <small>для лучшего горизонта</small>
                                </div>
                            </div>
                            <div className="risk-row">
                                <span>Волатильность на OHP</span>
                                <div className="risk-values">
                                    <strong>{formatPercent(result.volatility_at_ohp)}</strong>
                                    <small>{formatMoney(result.volatility_amount_at_ohp, result.currency_code)}</small>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="calculation-panel calculation-panel-wide">
                        <div className="calculation-panel-header">
                            <span className="label">Долгосрочная траектория</span>
                            <h2>График для поиска оптимального горизонта</h2>
                            <p className="section-note">
                                График показывает не ваш короткий запрос, а длинную траекторию, на которой модель
                                оценивает, как меняется ожидаемая стоимость и разброс сценариев при поиске OHP.
                            </p>
                        </div>
                        <div className="projection-chart-card">
                            <svg
                                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                                className="projection-chart"
                                preserveAspectRatio="none"
                            >
                                {chartScale?.yTicks.map((tick) => (
                                    <g key={`y-${tick.toFixed(2)}`}>
                                        <line
                                            x1={CHART_MARGIN.left}
                                            x2={CHART_WIDTH - CHART_MARGIN.right}
                                            y1={chartScale.scaleY(tick)}
                                            y2={chartScale.scaleY(tick)}
                                            className="chart-grid-line"
                                        />
                                        <text
                                            x={CHART_MARGIN.left - 12}
                                            y={chartScale.scaleY(tick) + 4}
                                            textAnchor="end"
                                            className="chart-axis-label"
                                        >
                                            {formatMoney(tick, result.currency_code)}
                                        </text>
                                    </g>
                                ))}
                                {chartScale?.xTickIndexes.map((index) => {
                                    const point = chartData[index];
                                    const x = chartScale.scaleX(index);
                                    return (
                                        <g key={`x-${point.days}`}>
                                            <line
                                                x1={x}
                                                x2={x}
                                                y1={CHART_MARGIN.top}
                                                y2={CHART_HEIGHT - CHART_MARGIN.bottom}
                                                className="chart-grid-line chart-grid-line-vertical"
                                            />
                                            <text
                                                x={x}
                                                y={CHART_HEIGHT - 14}
                                                textAnchor="middle"
                                                className="chart-axis-label"
                                            >
                                                {point.days} дн.
                                            </text>
                                        </g>
                                    );
                                })}
                                <line
                                    x1={CHART_MARGIN.left}
                                    x2={CHART_MARGIN.left}
                                    y1={CHART_MARGIN.top}
                                    y2={CHART_HEIGHT - CHART_MARGIN.bottom}
                                    className="chart-axis-line"
                                />
                                <line
                                    x1={CHART_MARGIN.left}
                                    x2={CHART_WIDTH - CHART_MARGIN.right}
                                    y1={CHART_HEIGHT - CHART_MARGIN.bottom}
                                    y2={CHART_HEIGHT - CHART_MARGIN.bottom}
                                    className="chart-axis-line"
                                />
                                <path d={upperPath} className="projection-line projection-line-upper" />
                                <path d={lowerPath} className="projection-line projection-line-lower" />
                                <path d={expectedPath} className="projection-line projection-line-main" />
                                {chartScale?.xTickIndexes.map((index) => {
                                    const point = chartData[index];
                                    return (
                                        <g key={`dot-${point.days}`}>
                                            <circle
                                                cx={chartScale.scaleX(index)}
                                                cy={chartScale.scaleY(point.expected_value)}
                                                r="4.5"
                                                className="chart-point"
                                            />
                                            <text
                                                x={chartScale.scaleX(index)}
                                                y={chartScale.scaleY(point.expected_value) - 12}
                                                textAnchor="middle"
                                                className="chart-point-label"
                                            >
                                                {formatMoney(point.expected_value, result.currency_code)}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="projection-legend">
                                <span><i className="legend-swatch legend-main" /> Ожидаемая стоимость</span>
                                <span><i className="legend-swatch legend-band" /> Диапазон ± волатильность</span>
                            </div>
                            <div className="projection-points-grid">
                                {chartData.slice(0, 6).map((point) => (
                                    <div key={point.days} className="projection-point-card">
                                        <span>{new Date(point.date).toLocaleDateString()}</span>
                                        <strong>{formatMoney(point.expected_value, result.currency_code)}</strong>
                                        <small>
                                            {formatPercent(point.expected_return)} · σ {formatPercent(point.volatility)}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="calculation-panel calculation-panel-wide">
                        <div className="calculation-panel-header">
                            <span className="label">Интерпретация</span>
                            <h2>Как читать этот расчет</h2>
                        </div>
                        <div className="insight-grid">
                            {insights.map((insight) => (
                                <div key={insight.title} className="insight-card">
                                    <strong>{insight.title}</strong>
                                    <p>{insight.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
