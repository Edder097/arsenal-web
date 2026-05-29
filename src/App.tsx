import React, { useEffect, useState } from 'react';
import ClienteLayout from './pages/ClienteLayout';
import FilmmakerPainel from './pages/FilmakerPainel'; // 👈 Importando o painel novo

export default function App() {
  const [caminhoAtual, setCaminhoAtual] = useState(window.location.pathname);

  useEffect(() => {
    // Escuta mudanças de navegação caso você queira fazer botões para alternar depois
    const tratarMudancaDeRota = () => {
      setCaminhoAtual(window.location.pathname);
    };

    window.addEventListener('popstate', tratarMudancaDeRota);
    return () => window.removeEventListener('popstate', tratarMudancaDeRota);
  }, []);

  // 🎛️ Roteamento condicional nativo e limpo
  if (caminhoAtual === '/filmmaker') {
    return <FilmmakerPainel />;
  }

  // Qualquer outra rota padrão renderiza a tela de agendamento do cliente
  return <ClienteLayout />;
}