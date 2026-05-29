import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Building2, Mail, Target, Phone, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://trabalho-agendamento-ensaios.onrender.com/api';

interface OcupacaoMes {
  data: string; // Formato 'YYYY-MM-DD'
  vagas_disponiveis: number;
}

export default function ClienteLayout() {
  const [passo, setPasso] = useState(1);
  const [formData, setFormData] = useState({
    empresa_nome: '',
    email_cliente: '',
    objetivos: '',
    contato_nome: '',
    contato_telefone: '',
    data_ensaio: '',
    hora_inicio: ''
  });

  const [disponibilidade, setDisponibilidade] = useState<{ permitido: boolean; horarios?: string[]; mensagem?: string }>({ permitido: true, horarios: [] });
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [agendadoComSucesso, setAgendadoComSucesso] = useState(false);

  // Estados do Calendário Customizado
  const [mesAtual, setMesAtual] = useState<Date>(new Date());
  const [agendaMes, setAgendaMes] = useState<OcupacaoMes[]>([]);

// 1. Mapeia a disponibilidade de todos os dias do mês atual ao trocar de mês
  useEffect(() => {
    const mapearDisponibilidadeDoMes = async () => {
      const ano = mesAtual.getFullYear();
      const mes = mesAtual.getMonth();
      const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
      const chamadasAPI = [];

      for (let dia = 1; dia <= totalDiasNoMes; dia++) {
        const diaFormatado = String(dia).padStart(2, '0');
        const mesFormatado = String(mes + 1).padStart(2, '0');
        const dataStr = `${ano}-${mesFormatado}-${diaFormatado}`;

        chamadasAPI.push(
          axios.get(`${API_URL}/agenda/disponibilidade?data=${dataStr}`)
            .then((res) => ({
              data: dataStr,
              vagas_disponiveis: (res.data.permitido && res.data.horarios?.length > 0) ? 1 : 0
            }))
            .catch(() => ({
              data: dataStr,
              vagas_disponiveis: 1 
            }))
        );
      }

      const resultados = await Promise.all(chamadasAPI);
      setAgendaMes(resultados);
    };

    mapearDisponibilidadeDoMes();
  }, [mesAtual]);

  // 2. Busca horários específicos de um dia selecionado (CORRIGIDO)
  useEffect(() => {
    // Validação flexível que aceita qualquer ano válido no formato YYYY-MM-DD
    if (formData.data_ensaio && formData.data_ensaio.length === 10) {
      setCarregandoHorarios(true);
      
      axios.get(`${API_URL}/agenda/disponibilidade?data=${formData.data_ensaio}`)
        .then((res) => {
          setDisponibilidade(res.data);
        })
        .catch((err) => {
          console.error("Erro na requisição:", err);
          alert('Erro ao consultar horários. Verifique se o Backend está ligado!');
        })
        .finally(() => setCarregandoHorarios(false));
    }
  }, [formData.data_ensaio]); // Monitora estritamente a mudança da data escolhida

  // 2. Busca horários específicos de um dia selecionado
  useEffect(() => {
    if (formData.data_ensaio && formData.data_ensaio.length === 10 && formData.data_ensaio.startsWith('202')) {
      setCarregandoHorarios(true);
      axios.get(`${API_URL}/agenda/disponibilidade?data=${formData.data_ensaio}`)
        .then((res) => {
          setDisponibilidade(res.data);
          setFormData(prev => ({ ...prev, hora_inicio: '' })); 
        })
        .catch(() => alert('Erro ao consultar horários. Verifique se o Backend está ligado!'))
        .finally(() => setCarregandoHorarios(false));
    }
  }, [formData.data_ensaio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/agenda/agendar`, formData);
      setAgendadoComSucesso(true);
    } catch (error) {
      alert('Erro ao realizar agendamento. Verifique se o backend está ligado.');
    }
  };

  // Auxiliares do Calendário
  const obterDiasDoMes = (data: Date) => {
    const ano = data.getFullYear();
    const mes = data.getMonth();
    const primeiroDiaDaSemana = new Date(ano, mes, 1).getDay();
    const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
    
    const dias = [];
    for (let i = 0; i < primeiroDiaDaSemana; i++) {
      dias.push(null);
    }
    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
      dias.push(new Date(ano, mes, dia));
    }
    return dias;
  };

  const mudarMes = (direcao: number) => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + direcao, 1));
  };

  const formatarDataParaString = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const checarDiaEsgotado = (data: Date) => {
    const str = formatarDataParaString(data);
    const registro = agendaMes.find(d => d.data === str);
    return registro ? registro.vagas_disponiveis === 0 : false;
  };

  const diasDoCalendario = obterDiasDoMes(mesAtual);
  const nomesDosMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  if (agendadoComSucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 p-8 rounded-2xl text-center shadow-xl">
          <CheckCircle className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Seu ensaio foi agendado com sucesso!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Agendado para o dia <span className="text-white font-semibold">{formData.data_ensaio.split('-').reverse().join('/')}</span> às{' '}
            <span className="text-white font-semibold">{formData.hora_inicio}</span>.
          </p>
          <div className="text-slate-400 text-xs text-left leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800">
            Iremos entrar em contato com vocês para tirarmos algumas dúvidas para desenvolvermos o roteiro deste ensaio. Em até 48 hours antes do ensaio te enviaremos o roteiro finalizado, para aprovação!
          </div>
          <p className="mt-6 text-xl font-semibold text-rose-500">Obrigado! 🚀</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        
        {/* Cabeçalho */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-500 bg-clip-text text-transparent">ArsenalConnect</h1>
          <p className="text-sm text-slate-400 mt-2">Olá, cliente da Arsenal! Siga o passo a passo para agendar seu ensaio:</p>
          <div className="flex gap-2 justify-center mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1.5 w-10 rounded-full transition-all duration-300 ${passo >= i ? 'bg-blue-500' : 'bg-slate-800'}`} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Passo 1: Dados da Empresa */}
          {passo === 1 && (
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-500" /> 1. Nome da sua empresa
              </label>
              <input
                type="text"
                required
                placeholder="Digite o nome da empresa"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500"
                value={formData.empresa_nome}
                onChange={(e) => setFormData({ ...formData, empresa_nome: e.target.value })}
              />
              <button type="button" disabled={!formData.empresa_nome} onClick={() => setPasso(2)} className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 font-bold p-3 rounded-lg transition-colors cursor-pointer">Avançar</button>
            </div>
          )}

          {/* Passo 2: Calendário Customizado e Horários */}
          {passo === 2 && (
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-500" /> 2. Escolha uma data para o ensaio
              </label>
              
              {/* COMPONENTE DO CALENDÁRIO VISUAL */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                {/* Header do Calendário */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-slate-200">
                    {nomesDosMeses[mesAtual.getMonth()]} de {mesAtual.getFullYear()}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => mudarMes(-1)} className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => mudarMes(1)} className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1">{d}</span>
                  ))}
                </div>

                {/* Grid de Dias */}
                <div className="grid grid-cols-7 gap-1">
                  {diasDoCalendario.map((data, index) => {
                    if (!data) return <div key={`vazio-${index}`} className="aspect-square" />;
                    
                    const strData = formatarDataParaString(data);
                    const ehEsgotado = checarDiaEsgotado(data);
                    const ehSelecionado = formData.data_ensaio === strData;

                    return (
                      <button
                        key={strData}
                        type="button"
                        disabled={ehEsgotado}
                        onClick={() => setFormData({ ...formData, data_ensaio: strData, hora_inicio: '' })}
                        className={`aspect-square relative flex items-center justify-center rounded-lg text-xs font-medium transition-all
                          ${ehEsgotado 
                            ? 'bg-red-950/10 border border-red-900/20 text-red-500/40 cursor-not-allowed line-through' 
                            : ehSelecionado
                              ? 'bg-rose-600 text-white font-bold border border-rose-500 shadow-md shadow-rose-900/20'
                              : 'bg-slate-900/60 text-slate-300 border border-slate-800/60 hover:border-slate-600 hover:bg-slate-900'
                          }
                        `}
                      >
                        <span>{data.getDate()}</span>
                        {ehEsgotado && (
                          <span className="absolute top-0.5 right-0.5 text-[7px] font-bold text-red-500 leading-none">✕</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legenda do Calendário */}
                <div className="mt-3 pt-3 border-t border-slate-900 flex justify-center gap-4 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-900 border border-slate-800" /> Disponível</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-950/20 border border-red-900/20 text-red-500 text-[6px] flex items-center justify-center font-bold">✕</span> Sem Vagas</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-600" /> Selecionado</div>
                </div>
              </div>

              {carregandoHorarios && <p className="text-xs text-slate-400 animate-pulse text-center">Consultando horários disponíveis para {formData.data_ensaio.split('-').reverse().join('/')}...</p>}

              {!carregandoHorarios && disponibilidade.permitido === false && (
                <div className="bg-amber-950/40 border border-amber-600/30 p-4 rounded-lg text-xs text-amber-400 leading-relaxed">
                  {disponibilidade.mensagem}
                </div>
              )}

              {!carregandoHorarios && disponibilidade.permitido && disponibilidade.horarios && disponibilidade.horarios.length > 0 && (
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" /> Escolha o horário de início (Duração: 4h)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {disponibilidade.horarios.map((hora) => (
                      <button
                        key={hora}
                        type="button"
                        className={`p-2.5 text-sm rounded-lg font-medium border transition-all cursor-pointer ${formData.hora_inicio === hora ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                        onClick={() => setFormData({ ...formData, hora_inicio: hora })}
                      >
                        {hora}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPasso(1)} className="w-1/2 border border-slate-800 hover:bg-slate-800 p-3 rounded-lg font-semibold transition-colors cursor-pointer">Voltar</button>
                <button type="button" disabled={!formData.data_ensaio || !formData.hora_inicio} onClick={() => setPasso(3)} className="w-1/2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 p-3 rounded-lg font-semibold transition-colors cursor-pointer">Avançar</button>
              </div>
            </div>
          )}

          {/* Passo 3: Objetivos e E-mail */}
          {passo === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-rose-500" /> 3. Qual o seu e-mail para confirmação?
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@empresa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500"
                  value={formData.email_cliente}
                  onChange={(e) => setFormData({ ...formData, email_cliente: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-rose-500" /> 4. Quais os objetivos para esta captação?
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva brevemente o que tem em mente..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500 resize-none"
                  value={formData.objetivos}
                  onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setPasso(2)} className="w-1/2 border border-slate-800 hover:bg-slate-800 p-3 rounded-lg font-semibold transition-colors cursor-pointer">Voltar</button>
                <button type="button" disabled={!formData.email_cliente || !formData.objetivos} onClick={() => setPasso(4)} className="w-1/2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 p-3 rounded-lg font-semibold transition-colors cursor-pointer">Avançar</button>
              </div>
            </div>
          )}

          {/* Passo 4: Contato e Finalização */}
          {passo === 4 && (
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Phone className="w-4 h-4 text-rose-500" /> 5. Quem consultamos para tirar dúvidas do roteiro?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome do contato"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500"
                  value={formData.contato_nome}
                  onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                />
                
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    required
                    placeholder="WhatsApp (ex: 5511999999999)"
                    className={`w-full bg-slate-950 border rounded-lg p-3 text-white focus:outline-none ${
                      formData.contato_telefone && !formData.contato_telefone.startsWith('55')
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-800 focus:border-rose-500'
                    }`}
                    value={formData.contato_telefone}
                    onChange={(e) => {
                      let valor = e.target.value.replace(/\D/g, '');
                      
                      if (valor.length > 0 && !valor.startsWith('55') && valor.length <= 11) {
                        if (valor.charAt(0) !== '5') {
                          valor = '55' + valor;
                        }
                      }
                      
                      setFormData({ ...formData, contato_telefone: valor });
                    }}
                  />
                  {formData.contato_telefone && !formData.contato_telefone.startsWith('55') && (
                    <span className="text-[10px] text-red-400 font-medium px-1">
                      ⚠️ O número deve obrigatoriamente começar com 55 (Brasil).
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setPasso(3)} className="w-1/2 border border-slate-800 hover:bg-slate-800 p-3 rounded-lg font-semibold transition-colors cursor-pointer">Voltar</button>
                <button 
                  type="submit" 
                  disabled={
                    !formData.contato_nome || 
                    !formData.contato_telefone || 
                    !formData.contato_telefone.startsWith('55') || 
                    formData.contato_telefone.length < 12
                  } 
                  className="w-1/2 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg font-bold text-white shadow-lg shadow-rose-900/20 transition-all cursor-pointer"
                >
                  AGENDAR ENSAIO
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}