import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://trabalho-agendamento-ensaios.onrender.com/api';

interface Ensaio {
  id: number;
  empresa_nome: string;
  contato_nome: string;
  contato_telefone: string;
  email_cliente: string;
  objetivos: string;
  data_ensaio: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  fotografo_responsavel: string | null;
  roteirista_responsavel: string | null;
  auxiliar_responsavel: string | null;
  motivo_cancelamento?: string | null;
  
  // Seus novos campos do banco
  link_roteiro: string | null;
  link_arquivos_ensaio: string | null;
  link_materiais_auxiliares: string | null;
}

interface MembroEquipe {
  id: number;
  nome: string;
  eh_roteirista: boolean;
}

export default function RoteiristaPainel() {
  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [roteiristas, setRoteiristas] = useState<MembroEquipe[]>([]);
  const [meuNome, setMeuNome] = useState<string>('');
  const [carregando, setCarregando] = useState(true);
  
  // Estado para armazenar temporariamente o link digitado para cada ensaio
  const [linksInputs, setLinksInputs] = useState<{[key: number]: string}>({});

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resEnsaios, resEquipe] = await Promise.all([
        axios.get(`${API_URL}/painel/ensaios`),
        axios.get(`${API_URL}/painel/equipe`)
      ]);

      setEnsaios(resEnsaios.data);
      
      // Filtra apenas quem é roteirista para o select do topo
      const apenasRoteiristas = resEquipe.data.filter((m: MembroEquipe) => m.eh_roteirista);
      setRoteiristas(apenasRoteiristas);

      // Preenche os inputs com os links que já existem no banco
      const inputsIniciais: any = {};
      resEnsaios.data.forEach((ensaio: Ensaio) => {
        inputsIniciais[ensaio.id] = ensaio.link_roteiro || '';
      });
      setLinksInputs(inputsIniciais);

    } catch (error) {
      alert('Erro ao carregar dados do painel do roteirista.');
    } finally {
      setCarregando(false);
    }
  };

  const salvarLinkRoteiro = async (id: number) => {
    const link = linksInputs[id]?.trim();

    if (!link) {
      alert('⚠️ Por favor, insira um link válido antes de salvar.');
      return;
    }

    try {
      // Faz o PATCH enviando apenas a coluna que o roteirista altera
      await axios.patch(`${API_URL}/painel/ensaios/${id}/status`, {
        link_roteiro: link
      });

      alert('🚀 Roteiro salvo e anexado ao ensaio com sucesso!');
      
      // Atualiza o estado local
      setEnsaios(prev => prev.map(e => e.id === id ? { ...e, link_roteiro: link } : e));
    } catch (error) {
      alert('Erro ao salvar o link do roteiro.');
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const formatarData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Filtra os ensaios para mostrar apenas os do roteirista selecionado e que não estejam cancelados
  const ensaiosFiltrados = ensaios.filter(ensaio => {
    const pertenceAMim = ensaio.roteirista_responsavel === meuNome;
    const naoEstaCancelado = ensaio.status !== 'Cancelado';
    return meuNome ? (pertenceAMim && naoEstaCancelado) : naoEstaCancelado;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img 
            src="/Arsenal.png" 
            alt="Logo Arsenal" 
            className="h-12 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#0ABAB5] bg-clip-text text-transparent">
              Painel do Roteirista
            </h1>
            <p className="text-slate-400 text-sm mt-1">Criação, planejamento e entrega de roteiros para o Arsenal Connect</p>
          </div>
        </div>
        <button 
          onClick={carregarDados}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          🔄 Atualizar Minhas Missões
        </button>
      </div>

      {/* Seleção de Identificação do Roteirista */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3 shadow-md max-w-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Quem é você?</span>
          <select
            value={meuNome}
            onChange={(e) => setMeuNome(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#0ABAB5] cursor-pointer"
          >
            <option value="">Select Seu Nome na Lista...</option>
            {roteiristas.map(r => (
              <option key={r.id} value={r.nome}>{r.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto">
        {!meuNome ? (
          <div className="text-center text-slate-400 border border-dashed border-slate-800 rounded-xl py-16 bg-slate-900/10">
            👋 Por favor, selecione seu nome acima para visualizar os roteiros pendentes da sua escala.
          </div>
        ) : carregando ? (
          <div className="text-center text-slate-500 py-12 animate-pulse font-medium">Buscando seus ensaios...</div>
        ) : ensaiosFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 border border-dashed border-slate-800 rounded-xl py-16 bg-slate-900/10">
            ☕ Nenhuma escala de roteiro encontrada para você no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ensaiosFiltrados.map((ensaio) => {
              const temRoteiro = !!ensaio.link_roteiro;
              const estaConcluido = ensaio.status === 'Concluído';
              
              return (
                <div 
                  key={ensaio.id} 
                  className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase">ID #{ensaio.id}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                        temRoteiro 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {temRoteiro ? '✍️ Roteiro Entregue' : '⏳ Sem Roteiro'}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 truncate">{ensaio.empresa_nome}</h3>
                    <p className="text-xs text-slate-400 mb-4">Contato na Empresa: <span className="text-slate-300 font-medium">{ensaio.contato_nome}</span></p>

                    {/* Data e Horário */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800/50 mb-4">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Data do Ensaio</span>
                        <span className="text-xs font-semibold text-slate-200">{formatarData(ensaio.data_ensaio)}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Horário</span>
                        <span className="text-xs font-semibold text-slate-200">
                          {ensaio.hora_inicio.substring(0, 5)} - {ensaio.hora_fim.substring(0, 5)}
                        </span>
                      </div>
                    </div>

                    {/* Briefing / Objetivos enviados pelo CS ou Cliente */}
                    <div className="mb-4">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Diretrizes & Briefing</span>
                      <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-950 text-left line-clamp-4 leading-relaxed">
                        {ensaio.objetivos || "Nenhum objetivo detalhado informado."}
                      </p>
                    </div>

                    {/* Informações de quem mais vai participar */}
                    <div className="mb-6 space-y-1 bg-slate-950/30 p-2 rounded-lg border border-slate-850 text-[11px]">
                      <div className="text-slate-400"><span className="text-slate-500 font-medium">📸 Filmmaker:</span> {ensaio.fotografo_responsavel || 'Não definido'}</div>
                      <div className="text-slate-400"><span className="text-slate-500 font-medium">💼 Auxiliar:</span> {ensaio.auxiliar_responsavel || 'Não definido'}</div>
                    </div>
                  </div>

                  {/* Campo de Ação: Upload do Roteiro */}
                  <div className="pt-3 border-t border-slate-800/60 mt-auto">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5"> Link do Roteiro (Google Docs / Notion)</label>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text" 
                        placeholder="https://docs.google.com/..." 
                        value={linksInputs[ensaio.id] || ''}
                        disabled={estaConcluido}
                        onChange={(e) => setLinksInputs(prev => ({ ...prev, [ensaio.id]: e.target.value }))}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-[#0ABAB5] disabled:opacity-50"
                      />
                      
                      <button
                        type="button"
                        onClick={() => salvarLinkRoteiro(ensaio.id)}
                        disabled={estaConcluido}
                        className="w-full py-2 bg-[#0ABAB5] hover:bg-[#0ABAB5]/90 disabled:bg-slate-800 text-slate-950 text-xs rounded font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {temRoteiro ? '🔄 Atualizar Link do Roteiro' : '💾 Enviar Roteiro'}
                      </button>
                    </div>

                    {/* Link rápido caso ele queira clicar e ler para testar */}
                    {temRoteiro && (
                      <a 
                        href={ensaio.link_roteiro!} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block text-center text-[11px] text-[#0ABAB5] hover:underline mt-2"
                      >
                        🔗 Abrir roteiro atual em nova aba
                      </a>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}