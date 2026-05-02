import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PrivateRoute from './components/PrivateRoute';
import MarketPage from './pages/MarketPage';
import PortfoliosPage from "./pages/PortfoliosPage";
import { PortfolioDetailsPage } from "./pages/PortfolioDetalisPage";
import { CalculationDetailsPage } from "./pages/CalculationDetailsPage";
import Header from './components/Header';
import { CalculationEventsProvider } from "./realtime/CalculationEventsContext";

const App: React.FC = () => {
    return (
        <Router>
            <CalculationEventsProvider>
                <Header />
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <MarketPage />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/portfolios"
                        element={
                            <PrivateRoute>
                                <PortfoliosPage />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/portfolio/:id"
                        element={
                            <PrivateRoute>
                                <PortfolioDetailsPage />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/portfolio/:portfolioId/calculations/:calculationId"
                        element={
                            <PrivateRoute>
                                <CalculationDetailsPage />
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </CalculationEventsProvider>
        </Router>
    );
};

export default App;
