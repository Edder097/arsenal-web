import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

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
}

interface MembroEquipe {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  eh_fotografo: boolean;
  eh_roteirista: boolean;
  eh_auxiliar: boolean;
}

export default function FilmmakerPainel() {
  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroProfissional, setFiltroProfissional] = useState<string>('');
  
  // 🆕 NOVO: Estado para gerenciar as abas de status
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'concluido' | 'cancelado'>('todos');

  const [equipeEditando, setEquipeEditando] = useState<{[key: number]: { fotografo: string, roteirista: string, auxiliar: string }}>({});

  const carregarDadosIniciais = async () => {
    try {
      setCarregando(true);
      
      const [resEnsaios, resEquipe] = await Promise.all([
        axios.get(`${API_URL}/painel/ensaios`),
        axios.get(`${API_URL}/painel/equipe`)
      ]);

      setEnsaios(resEnsaios.data);
      setEquipe(resEquipe.data);
      
      const dadosInputs: any = {};
      resEnsaios.data.forEach((ensaio: Ensaio) => {
        dadosInputs[ensaio.id] = {
          fotografo: ensaio.fotografo_responsavel || '',
          roteirista: ensaio.roteirista_responsavel || '',
          auxiliar: ensaio.auxiliar_responsavel || ''
        };
      });
      setEquipeEditando(dadosInputs);
    } catch (error) {
      alert('Erro ao carregar os dados do painel.');
    } finally {
      setCarregando(false);
    }
  };

  const salvarEquipe = async (id: number) => {
    try {
      const valores = equipeEditando[id];
      const fotografo = valores.fotografo;
      const roteirista = valores.roteirista;
      const auxiliar = valores.auxiliar;

      if (roteirista && roteirista === auxiliar) {
        alert("⚠️ Operação Inválida: O(A) mesmo(a) profissional não pode ser Roteirista e Auxiliar neste ensaio ao mesmo tempo!");
        return;
      }

      if (fotografo && (fotografo === roteirista || fotografo === auxiliar)) {
        alert("⚠️ Operação Inválida: O(A) Fotógrafo(a) não pode acumular outra função neste ensaio!");
        return;
      }

      await axios.patch(`${API_URL}/painel/ensaios/${id}/status`, {
        fotografo_responsavel: fotografo,
        roteirista_responsavel: roteirista,
        auxiliar_responsavel: auxiliar
      });
      
      alert('Equipe escalada com sucesso!');
      
      setEnsaios(prev => prev.map(e => e.id === id ? {
        ...e,
        fotografo_responsavel: fotografo,
        roteirista_responsavel: roteirista,
        auxiliar_responsavel: auxiliar
      } : e));
    } catch (error) {
      alert('Erro ao salvar os responsáveis da equipe.');
    }
  };

  const marcarComoConcluido = async (id: number) => {
    try {
      await axios.patch(`${API_URL}/painel/ensaios/${id}/status`, { status: 'Concluído' });
      setEnsaios(prev =>
        prev.map(ensaio => (ensaio.id === id ? { ...ensaio, status: 'Concluído' } : ensaio))
      );
    } catch (error) {
      alert('Erro ao atualizar o status do ensaio.');
    }
  };

  const cancelarEnsaio = async (id: number) => {
    const motivo = prompt("Por favor, digite o motivo do cancelamento deste ensaio:");
    
    if (motivo === null) return; 
    if (!motivo.trim()) {
      alert("⚠️ É obrigatório preencher o motivo para cancelar o ensaio.");
      return;
    }

    try {
      await axios.patch(`${API_URL}/painel/ensaios/${id}/status`, { 
        status: 'Cancelado',
        motivo_cancelamento: motivo 
      });

      setEnsaios(prev =>
        prev.map(ensaio => (ensaio.id === id ? { ...ensaio, status: 'Cancelado', motivo_cancelamento: motivo } : ensaio))
      );
      alert('Ensaio cancelado com sucesso.');
    } catch (error) {
      alert('Erro ao cancelar o ensaio.');
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const formatarData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const handleSelectChange = (id: number, campo: 'fotografo' | 'roteirista' | 'auxiliar', valor: string) => {
    setEquipeEditando(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  };

  const fotografosDisponiveis = equipe.filter(m => m.eh_fotografo === true);
  const roteiristasDisponiveis = equipe.filter(m => m.eh_roteirista === true);
  const auxiliaresDisponiveis = equipe.filter(m => m.eh_auxiliar === true);

  // 🎛️ LÓGICA DE FILTRAGEM ATUALIZADA (Une profissional + status da aba)
  const ensaiosFiltrados = ensaios.filter(ensaio => {
    // Parte 1: Filtro de Profissional
    const atendeProfissional = !filtroProfissional || (
      ensaio.fotografo_responsavel === filtroProfissional ||
      ensaio.roteirista_responsavel === filtroProfissional ||
      ensaio.auxiliar_responsavel === filtroProfissional
    );

    // Parte 2: Filtro de Status da Aba
    let atendeStatus = true;
    if (filtroStatus === 'pendente') {
      // Considera pendente tudo o que não for concluído nem cancelado (ex: "Agendado", "Pendente")
      atendeStatus = ensaio.status !== 'Concluído' && ensaio.status !== 'Cancelado';
    } else if (filtroStatus === 'concluido') {
      atendeStatus = ensaio.status === 'Concluído';
    } else if (filtroStatus === 'cancelado') {
      atendeStatus = ensaio.status === 'Cancelado';
    }

    return atendeProfissional && atendeStatus;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Cronograma de Production</h1>
          <p className="text-zinc-400 text-sm mt-1">Painel operacional para filmmakers e editores do Arsenal Connect</p>
        </div>
        <button 
          onClick={carregarDadosIniciais}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 rounded-lg text-sm transition-all"
        >
          🔄 Atualizar Agenda
        </button>
      </div>

      {/* Área de Filtros e Seleções */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col gap-4">
        
        {/* Filtro por Integrante (Layout Original) */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-auto">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block sm:inline">Filtrar por Integrante:</span>
          </div>
          <div className="w-full sm:w-64">
            <select
              value={filtroProfissional}
              onChange={(e) => setFiltroProfissional(e.target.value)}
              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700 appearance-none"
            >
              <option value="">👥 Todos os agendamentos da agência</option>
              {equipe.map(membro => (
                <option key={membro.id} value={membro.nome}>
                  {membro.nome}
                </option>
              ))}
            </select>
          </div>
          {filtroProfissional && (
            <button
              onClick={() => setFiltroProfissional('')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-all underline animate-fade-in"
            >
              Limpar Filtro
            </button>
          )}
        </div>

        {/* 🆕 NOVO: Abas de Status */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1 max-w-lg">
          <button
            type="button"
            onClick={() => setFiltroStatus('todos')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'todos'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('pendente')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'pendente'
                ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 shadow-md'
                : 'text-zinc-400 hover:text-amber-400'
            }`}
          >
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('concluido')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'concluido'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            Concluídos
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('cancelado')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'cancelado'
                ? 'bg-red-950/60 text-red-400 border border-red-900/30 shadow-md'
                : 'text-zinc-400 hover:text-red-400'
            }`}
          >
            Cancelados
          </button>
        </div>

      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto">
        {carregando ? (
          <div className="text-center text-zinc-500 py-12 animate-pulse">Carregando missões da semana...</div>
        ) : ensaiosFiltrados.length === 0 ? (
          <div className="text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl py-16 bg-zinc-900/10">
            Nenhum ensaio encontrado para os critérios selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ensaiosFiltrados.map((ensaio) => {
              const inputs = equipeEditando[ensaio.id] || { fotografo: '', roteirista: '', auxiliar: '' };
              const estaBloqueado = ensaio.status === 'Concluído' || ensaio.status === 'Cancelado';
              
              return (
                <div 
                  key={ensaio.id} 
                  className={`border rounded-xl p-5 flex flex-col justify-between transition-all duration-200 ${
                    ensaio.status === 'Cancelado'
                      ? 'bg-red-950/5 border-red-950/40 opacity-60'
                      : ensaio.status === 'Concluído' 
                        ? 'bg-zinc-900/20 border-zinc-900/60 opacity-60' 
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
                        ID #{ensaio.id}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        ensaio.status === 'Concluído' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : ensaio.status === 'Cancelado'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {ensaio.status}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 truncate">{ensaio.empresa_nome}</h3>
                    <p className="text-sm text-zinc-400 mb-4">Contato: {ensaio.contato_nome}</p>

                    {/* Data e Hora */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800/60 mb-4">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Data</span>
                        <span className="text-sm font-medium text-zinc-200">{formatarData(ensaio.data_ensaio)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Horário</span>
                        <span className="text-sm font-medium text-zinc-200">
                          {ensaio.hora_inicio.substring(0, 5)} - {ensaio.hora_fim.substring(0, 5)}
                        </span>
                      </div>
                    </div>

                    {/* Briefing */}
                    <div className="mb-4">
                      <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Briefing</span>
                      <p className="text-xs text-zinc-300 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 text-left line-clamp-3">
                        {ensaio.objetivos}
                      </p>
                    </div>

                    {/* Exibe o motivo se estiver cancelado */}
                    {ensaio.status === 'Cancelado' && ensaio.motivo_cancelamento && (
                      <div className="mb-4 bg-red-950/20 border border-red-900/40 rounded-lg p-3 text-left">
                        <span className="block text-[10px] uppercase tracking-wider text-red-400 font-bold mb-0.5">Motivo do Cancelamento</span>
                        <p className="text-xs text-zinc-300 italic">"{ensaio.motivo_cancelamento}"</p>
                      </div>
                    )}

                    {/* Form com SELECTS de Atribuição de Equipe */}
                    <div className="space-y-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/50 mb-6">
                      <div className="flex justify-between items-center mb-1">
                        <span className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Equipe Escalada</span>
                        {estaBloqueado && (
                          <span className="text-[10px] text-zinc-500 font-medium italic">🔒 Registro Travado</span>
                        )}
                      </div>
                      
                      {/* Select Fotógrafo */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-0.5">📸 Fotógrafo(a) / Filmmaker</label>
                        <select 
                          value={inputs.fotografo}
                          disabled={estaBloqueado}
                          onChange={(e) => handleSelectChange(ensaio.id, 'fotografo', e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-zinc-600 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Selecione um professional...</option>
                          {fotografosDisponiveis.map(f => (
                            <option key={f.id} value={f.nome}>{f.nome}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Roteirista */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-0.5">✍️ Roteirista</label>
                        <select 
                          value={inputs.roteirista}
                          disabled={estaBloqueado}
                          onChange={(e) => handleSelectChange(ensaio.id, 'roteirista', e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-zinc-600 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Selecione um professional...</option>
                          {roteiristasDisponiveis.map(r => (
                            <option key={r.id} value={r.nome}>{r.nome}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Auxiliar */}
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-0.5">💼 Auxiliar</label>
                        <select 
                          value={inputs.auxiliar}
                          disabled={estaBloqueado}
                          onChange={(e) => handleSelectChange(ensaio.id, 'auxiliar', e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-zinc-600 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Selecione um professional...</option>
                          {auxiliaresDisponiveis.map(a => (
                            <option key={a.id} value={a.nome}>{a.nome}</option>
                          ))}
                        </select>
                      </div>

                      {!estaBloqueado ? (
                        <button
                          type="button"
                          onClick={() => salvarEquipe(ensaio.id)}
                          className="w-full mt-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] rounded transition-all font-medium cursor-pointer"
                        >
                          💾 Confirmar Escalação
                        </button>
                      ) : (
                        <div className="w-full mt-2 py-1 bg-zinc-900/20 text-center text-zinc-600 text-[11px] border border-zinc-900 rounded font-medium">
                          Edição bloqueada para este ensaio
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="pt-2 border-t border-zinc-800/40 mt-auto flex flex-col gap-2">
                    <a 
                      href={`https://wa.me/${ensaio.contato_telefone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-center text-xs py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg transition-all"
                    >
                      💬 Chamar no WhatsApp
                    </a>
                    
                    {/* Botões de Ação Dinâmicos */}
                    {!estaBloqueado && (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => marcarComoConcluido(ensaio.id)}
                          className="w-full text-xs font-medium py-2 bg-white hover:bg-zinc-200 text-zinc-950 rounded-lg transition-all cursor-pointer"
                        >
                          ✓ Marcar como Concluído
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => cancelarEnsaio(ensaio.id)}
                          className="w-full text-xs font-medium py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg transition-all cursor-pointer"
                        >
                          🛑 Cancelar Ensaio
                        </button>
                      </div>
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