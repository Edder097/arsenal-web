import React, { useEffect, useState } from 'react';
import ClienteLayout from './pages/ClienteLayout';
import PainelEquipeDinamico from './pages/PainelEquipeDinamico'; // 🚀 Novo painel unificado
import FilmmakerPainel from './pages/FilmakerPainel'; // 🎛️ Seu painel de gerenciamento geral (ADM)

export default function App() {
  const [caminhoAtual, setCaminhoAtual] = useState(window.location.pathname);

  useEffect(() => {
    const tratarMudancaDeRota = () => {
      setCaminhoAtual(window.location.pathname);
    };

    window.addEventListener('popstate', tratarMudancaDeRota);
    return () => window.removeEventListener('popstate', tratarMudancaDeRota);
  }, []);

  // 🎛️ Rota do seu Painel de Gerenciamento Geral (ADM)
  if (caminhoAtual === '/gerenciamento') {
    return <FilmmakerPainel />;
  }

  // 🚀 Rota do Portal da Equipe Dinâmico com Login e Filtros
  if (caminhoAtual === '/painel') {
    return <PainelEquipeDinamico />;
  }

  // Qualquer outra rota padrão renderiza a tela de agendamento do cliente
  return <ClienteLayout />;
}