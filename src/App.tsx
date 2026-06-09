import React, { useEffect, useState } from 'react';
import ClienteLayout from './pages/ClienteLayout';
import PainelEquipeDinamico from './pages/PainelEquipeDinamico'; // 🚀 Importando o novo painel unificado

export default function App() {
  const [caminhoAtual, setCaminhoAtual] = useState(window.location.pathname);

  useEffect(() => {
    const tratarMudancaDeRota = () => {
      setCaminhoAtual(window.location.pathname);
    };

    window.addEventListener('popstate', tratarMudancaDeRota);
    return () => window.removeEventListener('popstate', tratarMudancaDeRota);
  }, []);

  // 🎛️ Rota do Painel da Equipe com Login e Filtro Dinâmico
  if (caminhoAtual === '/painel') {
    return <PainelEquipeDinamico />;
  }

  // Qualquer outra rota padrão renderiza a tela de agendamento do cliente
  return <ClienteLayout />;
}