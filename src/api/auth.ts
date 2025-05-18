import api from './client';

export interface LoginData {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
}

export const login = async (data: LoginData) => {
    const response = await api.post('/auth/login/', data);
    saveTokens(response.data);
};

export const register = async (data: RegisterData) => {
    const response = await api.post('/auth/register/', data);
    saveTokens(response.data);
};

export const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token');

    const response = await api.post('/auth/token/refresh/', { refresh });
    localStorage.setItem('access_token', response.data.access);
    return response.data.access;
};

export const saveTokens = (tokens: { access: string; refresh: string }) => {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
};

export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};
