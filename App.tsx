import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import RootDrawerNavigator from './navigation/RootDrawerNavigator';

function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <RootDrawerNavigator />
    </NavigationContainer>
  );
}

export default App;
