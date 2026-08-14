import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './src/redux/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

const queryClient = new QueryClient();

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </AuthProvider>
    </Provider>
  );
}
