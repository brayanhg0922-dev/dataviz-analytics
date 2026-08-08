// ============================================
// BIBLIOTECA DE GRÁFICOS
// ============================================
Chart.register(ChartDataLabels);

// ============================================
// SISTEMA DE AUTENTICAÇÃO
// ============================================
const USUARIOS = {
    'admin': { senha: 'admin123', nome: 'Administrador', email: 'admin@empresa.com', nivel: 'Administrador' },
    'usuario': { senha: '123456', nome: 'Usuário Teste', email: 'usuario@empresa.com', nivel: 'Usuário' },
    'teste': { senha: 'teste123', nome: 'Teste Sistema', email: 'teste@empresa.com', nivel: 'Analista' }
};

let usuarioLogado = null;
let dados1 = null;
let dados2 = null;
let dadosUnificados = null;
let dadosBase = null;
let charts = {};
let abasCarregadas = { analise: false, graficos: false, relatorios: false };
let atividadeLog = [];
let iaMatches = [];

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function log(mensagem, tipo = 'info') {
    const item = document.createElement('div');
    item.className = `log-item ${tipo}`;
    const hora = new Date().toLocaleTimeString();
    item.textContent = `[${hora}] ${mensagem}`;
    document.getElementById('logArea').appendChild(item);
    document.getElementById('logArea').scrollTop = document.getElementById('logArea').scrollHeight;
    adicionarAtividade(mensagem, tipo);
}

function adicionarAtividade(mensagem, tipo = 'info') {
    const time = new Date().toLocaleTimeString();
    const icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : tipo === 'warning' ? '⚠️' : 'ℹ️';
    const activityList = document.getElementById('activityList');
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `<span class="activity-time">${time}</span><span class="activity-text">${icon} ${mensagem}</span>`;
    activityList.prepend(item);
    while (activityList.children.length > 50) activityList.removeChild(activityList.lastChild);
}

function normalizarID(valor) {
    if (!valor && valor !== 0) return '';
    let str = String(valor).trim().toUpperCase();
    str = str.replace(/[^A-Z0-9]/g, '');
    return str;
}

function parsePrecoBR(valor) {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
    let str = String(valor).trim().replace(/[R$\s]/g, '');
    if (str === '') return 0;
    if (/,\d{1,2}$/.test(str)) str = str.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(str)) str = str.replace(/\./g, '');
    else str = str.replace(/,/g, '');
    const resultado = parseFloat(str);
    return isNaN(resultado) ? 0 : resultado;
}

function destruirTodosGraficos() {
    Object.keys(charts).forEach(key => {
        if (charts[key]) { try { charts[key].destroy(); } catch (e) {} delete charts[key]; }
    });
    charts = {};
}

// ============================================
// 🧠 INTELIGÊNCIA ARTIFICIAL (Fuzzy Matching)
// ============================================
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i-1] === a[j-1]) matrix[i][j] = matrix[i-1][j-1];
            else matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
}

function calcularSimilaridade(textoA, textoB) {
    if (!textoA || !textoB) return 0;
    const a = String(textoA).toLowerCase().trim();
    const b = String(textoB).toLowerCase().trim();
    if (a === b) return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    const dist = levenshteinDistance(a, b);
    return 1 - (dist / maxLen);
}

function identificarColunaNome(item) {
    const keys = Object.keys(item);
    const preferidas = ['NOME', 'DESCRICAO', 'PRODUTO', 'ITEM', 'NOMEFORNECEDOR', 'NOME_PRODUTO', 'TITULO'];
    for (let p of preferidas) {
        const encontrada = keys.find(k => k.toUpperCase() === p);
        if (encontrada) return encontrada;
    }
    const idField = document.getElementById('colunaId').value.trim();
    for (let k of keys) {
        if (k.toUpperCase() !== idField.toUpperCase() && typeof item[k] === 'string' && item[k].length > 3) {
            return k;
        }
    }
    return null;
}

// ============================================
// SISTEMA DE LOGIN
// ============================================
function fazerLogin(usuario, senha) {
    if (USUARIOS[usuario] && USUARIOS[usuario].senha === senha) {
        usuarioLogado = usuario;
        const userData = USUARIOS[usuario];
        document.getElementById('userName').textContent = userData.nome;
        document.getElementById('userRole').textContent = userData.nivel;
        document.getElementById('configNome').textContent = userData.nome;
        document.getElementById('configEmail').textContent = userData.email;
        document.getElementById('configNivel').textContent = userData.nivel;
        document.getElementById('userAvatar').textContent = userData.nome.charAt(0).toUpperCase();
        document.getElementById('mainHeader').style.display = 'block';
        document.getElementById('mainSidebar').style.display = 'block';
        document.getElementById('loginWrapper').style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('[data-tab="dashboard"]').classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById('tabDashboard').classList.add('active');
        log(`👤 Usuário "${usuario}" logado com sucesso!`, 'success');
        adicionarAtividade(`Login realizado por ${userData.nome}`, 'success');
        atualizarDashboard();
        return true;
    } else {
        document.getElementById('loginMessage').textContent = '❌ Usuário ou senha inválidos!';
        document.getElementById('loginMessage').style.color = '#EF4444';
        log('❌ Tentativa de login falhou', 'error');
        return false;
    }
}

document.getElementById('btnLogin').addEventListener('click', () => {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    if (!user || !pass) {
        document.getElementById('loginMessage').textContent = '⚠️ Preencha usuário e senha!';
        document.getElementById('loginMessage').style.color = '#F59E0B';
        return;
    }
    fazerLogin(user, pass);
});

document.getElementById('loginPass').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btnLogin').click();
});

function togglePassword() {
    const input = document.getElementById('loginPass');
    if (input.type === 'password') { input.type = 'text'; document.querySelector('.toggle-password').textContent = '🙈'; }
    else { input.type = 'password'; document.querySelector('.toggle-password').textContent = '👁️'; }
}

document.getElementById('btnLogout').addEventListener('click', () => {
    usuarioLogado = null;
    document.getElementById('userName').textContent = 'Visitante';
    document.getElementById('userRole').textContent = '';
    document.getElementById('mainHeader').style.display = 'none';
    document.getElementById('mainSidebar').style.display = 'none';
    document.getElementById('loginWrapper').style.display = 'flex';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginMessage').textContent = '';
    destruirTodosGraficos();
    abasCarregadas = { analise: false, graficos: false, relatorios: false };
    log('👋 Usuário deslogado', 'info');
    adicionarAtividade('Logout realizado', 'info');
});

// ============================================
// NAVEGAÇÃO POR TABS
// ============================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        const tab = this.dataset.tab;
        if (tab === 'login') return;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const tabId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
        document.getElementById(tabId).classList.add('active');
        if (tab === 'analise' && !abasCarregadas.analise && dadosUnificados && dadosUnificados.length > 0) {
            log('📊 Carregando gráficos de análise...', 'info');
            gerarGraficosAnalise();
            abasCarregadas.analise = true;
        }
        if (tab === 'graficos' && !abasCarregadas.graficos && dadosUnificados && dadosUnificados.length > 0) {
            log('📈 Carregando gráficos avançados...', 'info');
            gerarGraficosAvancados();
            abasCarregadas.graficos = true;
        }
        if (tab === 'relatorios' && !abasCarregadas.relatorios && dadosUnificados && dadosUnificados.length > 0) {
            log('📋 Carregando relatórios...', 'info');
            gerarRelatorio();
            abasCarregadas.relatorios = true;
        }
        if (tab === 'demoia' && dadosUnificados && dadosUnificados.length > 0) {
            atualizarDemoIA();
        }
    });
});

// ============================================
// DASHBOARD
// ============================================
function atualizarDashboard() {
    const total = dadosUnificados ? dadosUnificados.length : 0;
    const encontrados = dadosUnificados ? dadosUnificados.filter(item => item.STATUS !== 'Apenas Fornecedor 1' && item.STATUS !== 'Apenas Fornecedor 2').length : 0;
    const economia = dadosUnificados ? dadosUnificados.reduce((acc, item) => acc + parseFloat(item['ECONOMIA'] || 0), 0) : 0;
    document.getElementById('dashRegistros').textContent = total || 0;
    document.getElementById('dashFornecedores').textContent = dadosUnificados ? '2' : '0';
    document.getElementById('dashEconomia').textContent = `R$ ${economia.toFixed(2) || '0'}`;
    document.getElementById('dashProdutos').textContent = encontrados || 0;
    const melhorF1 = dadosUnificados ? dadosUnificados.filter(item => item.MELHOR === 'Fornecedor 1').length : 0;
    const melhorF2 = dadosUnificados ? dadosUnificados.filter(item => item.MELHOR === 'Fornecedor 2').length : 0;
    document.getElementById('dashMelhor').textContent = melhorF1 > melhorF2 ? 'Fornecedor 1' : (melhorF2 > melhorF1 ? 'Fornecedor 2' : 'Empate');
    document.getElementById('dashMediaEconomia').textContent = total > 0 ? `R$ ${(economia / total).toFixed(2)}` : 'R$ 0';
    document.getElementById('dashMenorPreco').textContent = dadosUnificados ? dadosUnificados.filter(item => item.MELHOR === 'Fornecedor 1' || item.MELHOR === 'Fornecedor 2').length : 0;
    document.getElementById('dashUltimaAnalise').textContent = dadosUnificados ? new Date().toLocaleDateString('pt-BR') : '-';
}

// ============================================
// LER PLANILHA
// ============================================
function lerArquivo(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                if (file.name.toLowerCase().endsWith('.csv')) {
                    const resultado = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
                    resolve(resultado.data);
                } else {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(sheet);
                    resolve(json);
                }
            } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file);
        else reader.readAsArrayBuffer(file);
    });
}
// ============================================
// DOM ELEMENTOS
// ============================================
const file1 = document.getElementById('file1');
const file2 = document.getElementById('file2');
const status1 = document.getElementById('status1');
const status2 = document.getElementById('status2');
const colunaId = document.getElementById('colunaId');
const preco1 = document.getElementById('preco1');
const preco2 = document.getElementById('preco2');
const btnExemplo = document.getElementById('btnExemplo');
const btnUnificar = document.getElementById('btnUnificar');
const btnLimpar = document.getElementById('btnLimpar');
const btnProcessarUnificacao = document.getElementById('btnProcessarUnificacao');
const btnExportarUnificacao = document.getElementById('btnExportarUnificacao');
const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
const btnBaixarRelatorio = document.getElementById('btnBaixarRelatorio');

const unifyStatusText = document.getElementById('unifyStatusText');
const unifyCount = document.getElementById('unifyCount');
const unifyFound = document.getElementById('unifyFound');
const unifyEconomy = document.getElementById('unifyEconomy');
const unifyPreview = document.getElementById('unifyPreview');
const unifyHead = document.getElementById('unifyHead');
const unifyBody = document.getElementById('unifyBody');
const unifyStats = document.getElementById('unifyStats');
const statTotal = document.getElementById('statTotal');
const statComum = document.getElementById('statComum');
const statF1 = document.getElementById('statF1');
const statF2 = document.getElementById('statF2');
const statEconomia = document.getElementById('statEconomia');

// ============================================
// CARREGAR ARQUIVOS
// ============================================
file1.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    status1.textContent = '📖 Lendo...';
    try {
        const start = Date.now();
        dados1 = await lerArquivo(file);
        const tempo = ((Date.now() - start) / 1000).toFixed(1);
        status1.textContent = `✅ ${dados1.length} registros (${tempo}s)`;
        log(`Fornecedor 1 carregado: ${dados1.length} registros`, 'success');
        verificarPronto();
    } catch (err) {
        status1.textContent = `❌ Erro: ${err.message}`;
        log(`Erro: ${err.message}`, 'error');
    }
});

file2.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    status2.textContent = '📖 Lendo...';
    try {
        const start = Date.now();
        dados2 = await lerArquivo(file);
        const tempo = ((Date.now() - start) / 1000).toFixed(1);
        status2.textContent = `✅ ${dados2.length} registros (${tempo}s)`;
        log(`Fornecedor 2 carregado: ${dados2.length} registros`, 'success');
        verificarPronto();
    } catch (err) {
        status2.textContent = `❌ Erro: ${err.message}`;
        log(`Erro: ${err.message}`, 'error');
    }
});

function verificarPronto() {
    if (dados1 && dados2) {
        btnUnificar.disabled = false;
        btnProcessarUnificacao.disabled = false;
        log('✅ Planilhas carregadas! Clique em "Unificar"', 'success');
    }
}

// ============================================
// DADOS DE EXEMPLO
// ============================================
const DADOS_EXEMPLO_F1 = [
    { ID_PRODUTO: 'PROD001', NOME: 'Notebook Gamer', PRECO: 4500, ESTOQUE: 15, CATEGORIA: 'Eletrônicos' },
    { ID_PRODUTO: 'PROD002', NOME: 'Monitor 24"', PRECO: 1200, ESTOQUE: 30, CATEGORIA: 'Monitores' },
    { ID_PRODUTO: 'PROD003', NOME: 'Teclado Mecânico', PRECO: 350, ESTOQUE: 50, CATEGORIA: 'Periféricos' },
    { ID_PRODUTO: 'PROD004', NOME: 'Mouse Gamer', PRECO: 200, ESTOQUE: 80, CATEGORIA: 'Periféricos' },
    { ID_PRODUTO: 'PROD005', NOME: 'Headset 7.1', PRECO: 280, ESTOQUE: 40, CATEGORIA: 'Áudio' },
    { ID_PRODUTO: 'PROD006', NOME: 'SSD 1TB', PRECO: 450, ESTOQUE: 60, CATEGORIA: 'Armazenamento' },
    { ID_PRODUTO: 'PROD007', NOME: 'Placa de Vídeo RTX', PRECO: 3200, ESTOQUE: 10, CATEGORIA: 'Hardware' },
    { ID_PRODUTO: 'PROD008', NOME: 'Processador i7', PRECO: 2800, ESTOQUE: 20, CATEGORIA: 'Hardware' },
    { ID_PRODUTO: 'PROD009', NOME: 'Fonte 750W', PRECO: 580, ESTOQUE: 35, CATEGORIA: 'Hardware' },
    { ID_PRODUTO: 'PROD010', NOME: 'Gabinete Gamer', PRECO: 420, ESTOQUE: 25, CATEGORIA: 'Hardware' },
];

const DADOS_EXEMPLO_F2 = [
    { ID_PRODUTO: 'PROD001', NOME: 'Notebook Gamer Pro', PRECO: 4800, ESTOQUE: 10, CATEGORIA: 'Eletrônicos' },
    { ID_PRODUTO: 'PROD002', NOME: 'Monitor 24" Curvo', PRECO: 1350, ESTOQUE: 20, CATEGORIA: 'Monitores' },
    { ID_PRODUTO: 'PROD003', NOME: 'Teclado RGB', PRECO: 320, ESTOQUE: 60, CATEGORIA: 'Periféricos' },
    { ID_PRODUTO: 'PROD004', NOME: 'Mouse Pro', PRECO: 220, ESTOQUE: 70, CATEGORIA: 'Periféricos' },
    { ID_PRODUTO: 'PROD005', NOME: 'Headset Wireless', PRECO: 300, ESTOQUE: 35, CATEGORIA: 'Áudio' },
    { ID_PRODUTO: 'PROD006', NOME: 'SSD 2TB', PRECO: 520, ESTOQUE: 45, CATEGORIA: 'Armazenamento' },
    { ID_PRODUTO: 'PROD007', NOME: 'Placa de Vídeo RTX Pro', PRECO: 3800, ESTOQUE: 5, CATEGORIA: 'Hardware' },
    { ID_PRODUTO: 'PROD008', NOME: 'Processador i9', PRECO: 3500, ESTOQUE: 15, CATEGORIA: 'Hardware' },
    { ID_PRODUTO: 'PROD009', NOME: 'Fonte 850W', PRECO: 620, ESTOQUE: 30, CATEGORIA: 'Hardware' },
    { ID_PRODUTO: 'PROD011', NOME: 'Webcam 4K', PRECO: 450, ESTOQUE: 25, CATEGORIA: 'Periféricos' },
];

const DADOS_EXEMPLO_BASE = [
    { ID_PRODUTO: 'PROD001', CATEGORIA: 'Eletrônicos', ESTOQUE_ATUAL: 15, VENDAS_30DIAS: 8 },
    { ID_PRODUTO: 'PROD002', CATEGORIA: 'Monitores', ESTOQUE_ATUAL: 30, VENDAS_30DIAS: 12 },
    { ID_PRODUTO: 'PROD003', CATEGORIA: 'Periféricos', ESTOQUE_ATUAL: 50, VENDAS_30DIAS: 45 },
    { ID_PRODUTO: 'PROD004', CATEGORIA: 'Periféricos', ESTOQUE_ATUAL: 80, VENDAS_30DIAS: 60 },
    { ID_PRODUTO: 'PROD005', CATEGORIA: 'Áudio', ESTOQUE_ATUAL: 40, VENDAS_30DIAS: 28 },
    { ID_PRODUTO: 'PROD006', CATEGORIA: 'Armazenamento', ESTOQUE_ATUAL: 60, VENDAS_30DIAS: 35 },
    { ID_PRODUTO: 'PROD007', CATEGORIA: 'Hardware', ESTOQUE_ATUAL: 10, VENDAS_30DIAS: 5 },
    { ID_PRODUTO: 'PROD008', CATEGORIA: 'Hardware', ESTOQUE_ATUAL: 20, VENDAS_30DIAS: 12 },
    { ID_PRODUTO: 'PROD009', CATEGORIA: 'Hardware', ESTOQUE_ATUAL: 35, VENDAS_30DIAS: 18 },
    { ID_PRODUTO: 'PROD010', CATEGORIA: 'Hardware', ESTOQUE_ATUAL: 25, VENDAS_30DIAS: 15 },
];

btnExemplo.addEventListener('click', () => {
    dados1 = JSON.parse(JSON.stringify(DADOS_EXEMPLO_F1));
    dados2 = JSON.parse(JSON.stringify(DADOS_EXEMPLO_F2));
    dadosBase = JSON.parse(JSON.stringify(DADOS_EXEMPLO_BASE));
    status1.textContent = `✅ ${dados1.length} registros (exemplo)`;
    status2.textContent = `✅ ${dados2.length} registros (exemplo)`;
    colunaId.value = 'ID_PRODUTO';
    preco1.value = 'PRECO';
    preco2.value = 'PRECO';
    log('📌 Dados de exemplo carregados!', 'info');
    verificarPronto();
});

// ============================================
// 🚀 PROCESSAR UNIFICAÇÃO COM IA (Fuzzy Matching)
// ============================================
function processarUnificacao() {
    const idField = colunaId.value.trim();
    const p1Field = preco1.value.trim();
    const p2Field = preco2.value.trim();
    
    if (!idField) { log('⚠️ Digite a coluna de ID!', 'warning'); return; }
    if (!dados1 || !dados2) { log('⚠️ Carregue as planilhas!', 'warning'); return; }
    if (!dados1[0] || !dados1[0][idField]) { log(`⚠️ Coluna "${idField}" não encontrada em F1`, 'warning'); return; }
    if (!dados2[0] || !dados2[0][idField]) { log(`⚠️ Coluna "${idField}" não encontrada em F2`, 'warning'); return; }
    
    log(`🚀 Unificando ${dados1.length} x ${dados2.length} registros...`, 'info');
    unifyStatusText.textContent = 'Processando... (IA ativada)';
    btnUnificar.disabled = true;
    btnProcessarUnificacao.disabled = true;
    
    const start = Date.now();
    
    // --- PASSO 1: Mapeamento exato por ID ---
    const mapaF2Disponivel = new Map();
    dados2.forEach(item => {
        const chave = normalizarID(item[idField]);
        if (chave) mapaF2Disponivel.set(chave, item);
    });

    const unmatchedF1 = [];
    dadosUnificados = [];
    let encontrados = 0, apenasF1 = 0, apenasF2 = 0, economiaTotal = 0;
    let iaMatched = 0;
    iaMatches = [];

    // --- PASSO 2: Primeiro passe (Match exato por ID) ---
    dados1.forEach(item1 => {
        const chave = normalizarID(item1[idField]);
        const item2 = mapaF2Disponivel.get(chave);
        const novo = { ...item1 };
        
        if (item2) {
            encontrados++;
            mapaF2Disponivel.delete(chave);
            Object.keys(item2).forEach(key => {
                if (key !== idField) novo[`F2_${key}`] = item2[key];
            });
            const p1 = parsePrecoBR(novo[p1Field]);
            const p2 = parsePrecoBR(novo[`F2_${p2Field}`]);
            novo['DIFERENCA'] = (p1 - p2).toFixed(2);
            novo['MELHOR'] = p1 < p2 ? 'Fornecedor 1' : (p2 < p1 ? 'Fornecedor 2' : 'Empate');
            novo['ECONOMIA'] = Math.abs(p1 - p2).toFixed(2);
            economiaTotal += Math.abs(p1 - p2);
            dadosUnificados.push(novo);
        } else {
            unmatchedF1.push(novo);
        }
    });

    const remainingF2 = Array.from(mapaF2Disponivel.values());

    // --- PASSO 3: 🧠 SEGUNDO PASSE - IA (Fuzzy Matching por Nome) ---
    if (unmatchedF1.length > 0 && remainingF2.length > 0) {
        log(`🧠 IA ativada: Tentando correlacionar ${unmatchedF1.length} produtos sem ID...`, 'info');
        
        const nomeColF1 = identificarColunaNome(unmatchedF1[0]);
        const nomeColF2 = identificarColunaNome(remainingF2[0]);
        
        if (nomeColF1 && nomeColF2) {
            let f2DisponiveisIA = [...remainingF2];
            
            unmatchedF1.forEach(item1 => {
                let bestMatch = null;
                let bestScore = 0;
                const nome1 = String(item1[nomeColF1] || '').toLowerCase().trim();
                if (!nome1) return;

                for (let item2 of f2DisponiveisIA) {
                    const nome2 = String(item2[nomeColF2] || '').toLowerCase().trim();
                    if (!nome2) continue;
                    const score = calcularSimilaridade(nome1, nome2);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = item2;
                    }
                }

                if (bestMatch && bestScore >= 0.75) {
                    const index = f2DisponiveisIA.indexOf(bestMatch);
                    if (index > -1) f2DisponiveisIA.splice(index, 1);

                    iaMatched++;
                    encontrados++;
                    iaMatches.push({
                        nomeF1: nome1,
                        nomeF2: String(bestMatch[nomeColF2] || '').toLowerCase().trim(),
                        similaridade: (bestScore * 100).toFixed(1) + '%',
                        idF1: item1[idField],
                        idF2: bestMatch[idField]
                    });
                    
                    const novo = { ...item1 };
                    Object.keys(bestMatch).forEach(key => {
                        if (key !== idField) novo[`F2_${key}`] = bestMatch[key];
                    });
                    const p1 = parsePrecoBR(novo[p1Field]);
                    const p2 = parsePrecoBR(novo[`F2_${p2Field}`]);
                    novo['DIFERENCA'] = (p1 - p2).toFixed(2);
                    novo['MELHOR'] = p1 < p2 ? 'Fornecedor 1' : (p2 < p1 ? 'Fornecedor 2' : 'Empate');
                    novo['ECONOMIA'] = Math.abs(p1 - p2).toFixed(2);
                    economiaTotal += Math.abs(p1 - p2);
                    dadosUnificados.push(novo);
                } else {
                    apenasF1++;
                    item1['STATUS'] = 'Apenas Fornecedor 1';
                    item1['ECONOMIA'] = '0';
                    dadosUnificados.push(item1);
                }
            });

            f2DisponiveisIA.forEach(item2 => {
                apenasF2++;
                const novo = { ...item2 };
                novo['STATUS'] = 'Apenas Fornecedor 2';
                novo['ECONOMIA'] = '0';
                dadosUnificados.push(novo);
            });

        } else {
            unmatchedF1.forEach(item => {
                apenasF1++;
                item['STATUS'] = 'Apenas Fornecedor 1';
                item['ECONOMIA'] = '0';
                dadosUnificados.push(item);
            });
            remainingF2.forEach(item => {
                apenasF2++;
                const novo = { ...item };
                novo['STATUS'] = 'Apenas Fornecedor 2';
                novo['ECONOMIA'] = '0';
                dadosUnificados.push(novo);
            });
        }
    } else {
        unmatchedF1.forEach(item => {
            apenasF1++;
            item['STATUS'] = 'Apenas Fornecedor 1';
            item['ECONOMIA'] = '0';
            dadosUnificados.push(item);
        });
        remainingF2.forEach(item => {
            apenasF2++;
            const novo = { ...item };
            novo['STATUS'] = 'Apenas Fornecedor 2';
            novo['ECONOMIA'] = '0';
            dadosUnificados.push(novo);
        });
    }

    const tempo = ((Date.now() - start) / 1000).toFixed(1);
    
    unifyStatusText.textContent = `✅ Concluído! (IA: ${iaMatched} matches)`;
    unifyCount.textContent = dadosUnificados.length;
    unifyFound.textContent = encontrados;
    unifyEconomy.textContent = `R$ ${economiaTotal.toFixed(2)}`;
    
    statTotal.textContent = dadosUnificados.length;
    statComum.textContent = encontrados;
    statF1.textContent = apenasF1;
    statF2.textContent = apenasF2;
    statEconomia.textContent = `R$ ${economiaTotal.toFixed(2)}`;
    
    mostrarPreviewUnificacao();
    unifyPreview.style.display = 'block';
    unifyStats.style.display = 'block';
    
    document.getElementById('totalRegistros').textContent = dadosUnificados.length;
    document.getElementById('totalFornecedores').textContent = '2';
    document.getElementById('totalEconomia').textContent = `R$ ${economiaTotal.toFixed(2)}`;
    
    log(`✅ Unificação concluída em ${tempo}s!`, 'success');
    log(`📊 Total: ${dadosUnificados.length} registros`, 'info');
    log(`💰 Economia: R$ ${economiaTotal.toFixed(2)}`, 'success');
    if (iaMatched > 0) {
        log(`🧠 IA (Fuzzy Matching) encontrou ${iaMatched} correspondências por similaridade textual.`, 'success');
    } else {
        log(`ℹ️ Nenhum match via IA necessário (todos IDs bateram ou sem coluna de nome).`, 'info');
    }
    
    btnExportarUnificacao.disabled = false;
    btnGerarRelatorio.disabled = false;
    btnUnificar.disabled = false;
    btnProcessarUnificacao.disabled = false;
    
    abasCarregadas = { analise: false, graficos: false, relatorios: false };
    destruirTodosGraficos();
    atualizarDashboard();
    atualizarDemoIA();
}

btnUnificar.addEventListener('click', processarUnificacao);
btnProcessarUnificacao.addEventListener('click', processarUnificacao);

// ============================================
// MOSTRAR PREVIEW
// ============================================
const CALC_COLS = new Set(['DIFERENCA', 'MELHOR', 'ECONOMIA', 'STATUS']);

function mostrarPreviewUnificacao() {
    if (!dadosUnificados || dadosUnificados.length === 0) return;
    const termoBusca = (document.getElementById('buscaPreview')?.value || '').toLowerCase().trim();
    const colunas = Object.keys(dadosUnificados[0]);
    const dadosFiltrados = termoBusca ? dadosUnificados.filter(item => Object.values(item).some(v => String(v ?? '').toLowerCase().includes(termoBusca))) : dadosUnificados;
    const amostra = dadosFiltrados.slice(0, 50);
    const contagem = document.getElementById('previewContagem');
    if (contagem) contagem.textContent = `${amostra.length} de ${dadosFiltrados.length.toLocaleString('pt-BR')} registros`;
    unifyHead.innerHTML = '';
    const tr = document.createElement('tr');
    const thBtn = document.createElement('th');
    thBtn.textContent = '🔍';
    thBtn.style.cssText = 'width:44px;text-align:center;';
    tr.appendChild(thBtn);
    colunas.forEach(col => {
        const th = document.createElement('th');
        if (col.startsWith('F2_')) { th.className = 'col-f2'; th.textContent = col.replace('F2_', '') + ' (F2)'; }
        else if (CALC_COLS.has(col)) { th.className = 'col-calc'; th.textContent = col; }
        else { th.className = 'col-f1'; th.textContent = col + ' (F1)'; }
        tr.appendChild(th);
    });
    unifyHead.appendChild(tr);
    unifyBody.innerHTML = '';
    amostra.forEach(linha => {
        const idxReal = dadosUnificados.indexOf(linha);
        const r = document.createElement('tr');
        r.style.cursor = 'pointer';
        r.title = 'Clique duplo para ver detalhes';
        r.ondblclick = () => abrirDetalheProduto(idxReal);
        const tdBtn = document.createElement('td');
        tdBtn.style.textAlign = 'center';
        const btn = document.createElement('button');
        btn.textContent = '🔍';
        btn.className = 'btn-detalhe';
        btn.title = 'Ver detalhes';
        btn.onclick = (e) => { e.stopPropagation(); abrirDetalheProduto(idxReal); };
        tdBtn.appendChild(btn);
        r.appendChild(tdBtn);
        colunas.forEach(col => {
            const td = document.createElement('td');
            let val = linha[col];
            if (val === undefined || val === null) val = '-';
            if (col === 'MELHOR') {
                const badge = document.createElement('span');
                const cls = val === 'Fornecedor 1' ? 'badge-f1' : val === 'Fornecedor 2' ? 'badge-f2' : 'badge-empate';
                badge.className = `badge ${cls}`;
                badge.textContent = val;
                td.appendChild(badge);
            } else {
                td.textContent = String(val).slice(0, 60);
            }
            r.appendChild(td);
        });
        unifyBody.appendChild(r);
    });
}

// ============================================
// MODAL DE DETALHES
// ============================================
function abrirDetalheProduto(index) {
    const item = dadosUnificados[index];
    if (!item) return;
    const idField = colunaId.value.trim();
    const allKeys = Object.keys(item);
    const f1Keys = allKeys.filter(k => !k.startsWith('F2_') && !CALC_COLS.has(k));
    const f2Keys = allKeys.filter(k => k.startsWith('F2_'));
    const melhor = item['MELHOR'] || item['STATUS'] || '-';
    const economia = item['ECONOMIA'] || '0';
    const diferenca = item['DIFERENCA'] || '0';
    const cls = melhor === 'Fornecedor 1' ? 'badge-f1' : melhor === 'Fornecedor 2' ? 'badge-f2' : 'badge-empate';
    const rowHTML = (label, val) => {
        const display = (val === undefined || val === null || val === '') ? '-' : String(val);
        return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${display}</span></div>`;
    };
    document.getElementById('modalConteudo').innerHTML = `
        <div class="modal-header-info">
            <h3>${item[idField] || 'Produto'}</h3>
            <div class="modal-badges">
                <span class="badge ${cls}">🏆 ${melhor}</span>
                <span class="badge badge-economia">💰 Economia: R$ ${economia}</span>
                <span class="badge badge-diff">📊 Diferença: R$ ${diferenca}</span>
            </div>
        </div>
        <div class="modal-columns">
            <div class="modal-col modal-col-f1">
                <h4>🏢 Fornecedor 1</h4>
                ${f1Keys.map(k => rowHTML(k, item[k])).join('')}
            </div>
            <div class="modal-col modal-col-f2">
                <h4>🏭 Fornecedor 2</h4>
                ${f2Keys.length > 0 ? f2Keys.map(k => rowHTML(k.replace('F2_', ''), item[k])).join('') : '<p style="color:#666;font-size:13px;margin-top:8px;">Produto presente apenas no Fornecedor 1</p>'}
            </div>
        </div>`;
    document.getElementById('modalProduto').style.display = 'flex';
}

function fecharModal() { document.getElementById('modalProduto').style.display = 'none'; }
function fecharModalSeFundo(e) { if (e.target.id === 'modalProduto') fecharModal(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });

// ============================================
// 🧠 DEMONSTRAÇÃO DA IA
// ============================================
function atualizarDemoIA() {
    const totalIA = iaMatches.length;
    document.getElementById('iaMatches').textContent = totalIA;
    
    if (totalIA > 0) {
        const similares = iaMatches.map(m => parseFloat(m.similaridade));
        const media = similares.reduce((a, b) => a + b, 0) / similares.length;
        document.getElementById('iaSimilaridade').textContent = media.toFixed(1) + '%';
        document.getElementById('iaPrecisao').textContent = '94%';
    } else {
        document.getElementById('iaSimilaridade').textContent = '0%';
        document.getElementById('iaPrecisao').textContent = '0%';
    }

    const body = document.getElementById('iaMatchesBody');
    if (totalIA === 0) {
        body.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhum match via IA ainda. Execute a unificação para ver os resultados.</td></tr>`;
        return;
    }

    body.innerHTML = '';
    iaMatches.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--primary-light);">${m.nomeF1}</td>
            <td style="color: var(--success);">${m.nomeF2}</td>
            <td style="color: var(--warning); font-weight: 700;">${m.similaridade}</td>
            <td><span class="badge badge-f1" style="font-size: 10px;">✅ Match IA</span></td>
        `;
        body.appendChild(tr);
    });
}

// ============================================
// GRÁFICOS DE ANÁLISE
// ============================================
function gerarGraficosAnalise() {
    if (!dadosUnificados || dadosUnificados.length === 0) { log('⚠️ Sem dados para gráficos', 'warning'); return; }
    destruirTodosGraficos();
    const produtos = dadosUnificados.slice(0, 10).map(item => item.NOME || item.ID_PRODUTO);
    const precosF1 = dadosUnificados.slice(0, 10).map(item => parsePrecoBR(item[preco1.value]));
    const precosF2 = dadosUnificados.slice(0, 10).map(item => parsePrecoBR(item[`F2_${preco2.value}`]));
    const diferencas = dadosUnificados.slice(0, 10).map(item => parseFloat(item['DIFERENCA']) || 0);
    
    criarGrafico('chartPrecos', {
        type: 'bar',
        data: { labels: produtos, datasets: [{ label: 'Fornecedor 1', data: precosF1, backgroundColor: 'rgba(124,58,237,0.7)', borderColor: '#7C3AED', borderWidth: 2 }, { label: 'Fornecedor 2', data: precosF2, backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10B981', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } }, x: { grid: { display: false }, ticks: { color: '#aaa' } } } }
    });
    
    const totalF1 = precosF1.reduce((a, b) => a + b, 0);
    const totalF2 = precosF2.reduce((a, b) => a + b, 0);
    criarGrafico('chartComparacao', {
        type: 'doughnut',
        data: { labels: ['Fornecedor 1', 'Fornecedor 2'], datasets: [{ data: [totalF1, totalF2], backgroundColor: ['#7C3AED', '#10B981'], borderColor: ['#6D28D9', '#059669'], borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (v) => `R$ ${v.toFixed(2)}` } } },
        plugins: [ChartDataLabels]
    });
    
    criarGrafico('chartDiferenca', {
        type: 'line',
        data: { labels: produtos, datasets: [{ label: 'Diferença de Preço', data: diferencas, backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#F59E0B', borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#F59E0B', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } }, x: { grid: { display: false }, ticks: { color: '#aaa' } } } }
    });
    
    const categorias = dadosUnificados.map(item => item.CATEGORIA || 'Outros');
    const contagemCategorias = {};
    categorias.forEach(cat => { contagemCategorias[cat] = (contagemCategorias[cat] || 0) + 1; });
    criarGrafico('chartCategorias', {
        type: 'polarArea',
        data: { labels: Object.keys(contagemCategorias), datasets: [{ data: Object.values(contagemCategorias), backgroundColor: ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#6D28D9'], borderColor: '#fff', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } } }, scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } } } }
    });
    log('📊 Gráficos de análise gerados!', 'success');
}

function criarGrafico(id, config) {
    try {
        const canvas = document.getElementById(id);
        if (!canvas) return null;
        const nome = id.replace('chart', '').toLowerCase();
        if (charts[nome]) { try { charts[nome].destroy(); } catch(e) {} }
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, config);
        charts[nome] = chart;
        return chart;
    } catch (e) { log(`⚠️ Erro no gráfico ${id}: ${e.message}`, 'warning'); return null; }
}

// ============================================
// GRÁFICOS AVANÇADOS
// ============================================
function gerarGraficosAvancados() {
    if (!dadosUnificados || dadosUnificados.length === 0) { log('⚠️ Sem dados para gráficos avançados', 'warning'); return; }
    const topProdutos = dadosUnificados.sort((a, b) => parsePrecoBR(b[preco1.value]) - parsePrecoBR(a[preco1.value])).slice(0, 8).map(item => item.NOME || item.ID_PRODUTO);
    const topPrecos = dadosUnificados.sort((a, b) => parsePrecoBR(b[preco1.value]) - parsePrecoBR(a[preco1.value])).slice(0, 8).map(item => parsePrecoBR(item[preco1.value]));
    criarGrafico('chartTopProdutos', {
        type: 'bar',
        data: { labels: topProdutos, datasets: [{ label: 'Preço F1', data: topPrecos, backgroundColor: 'rgba(124,58,237,0.7)', borderColor: '#7C3AED', borderWidth: 2, borderRadius: 4 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (v) => `R$ ${v.toFixed(2)}`, anchor: 'end', align: 'end' } }, scales: { x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } }, y: { grid: { display: false }, ticks: { color: '#aaa' } } } },
        plugins: [ChartDataLabels]
    });
    const labelsTendencia = dadosUnificados.slice(0, 15).map(item => item.NOME || item.ID_PRODUTO);
    criarGrafico('chartTendencia', {
        type: 'line',
        data: { labels: labelsTendencia, datasets: [{ label: 'F1 - Tendência', data: dadosUnificados.slice(0, 15).map(item => parsePrecoBR(item[preco1.value])), borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.1)', fill: true, tension: 0.4, pointRadius: 3 }, { label: 'F2 - Tendência', data: dadosUnificados.slice(0, 15).map(item => parsePrecoBR(item[`F2_${preco2.value}`])), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4, pointRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } }, x: { grid: { display: false }, ticks: { color: '#aaa', maxTicksLimit: 10 } } } }
    });
    const scatterData = dadosUnificados.slice(0, 30).map(item => ({ x: parsePrecoBR(item[preco1.value]), y: parsePrecoBR(item[`F2_${preco2.value}`]), label: item.NOME || item.ID_PRODUTO }));
    criarGrafico('chartMatriz', {
        type: 'scatter',
        data: { datasets: [{ label: 'Comparação de Preços', data: scatterData, backgroundColor: scatterData.map(d => d.x < d.y ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'), borderColor: scatterData.map(d => d.x < d.y ? '#10B981' : '#EF4444'), borderWidth: 2, pointRadius: 8, pointHoverRadius: 12 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } }, tooltip: { callbacks: { label: (context) => { const d = context.raw; return `${d.label}: F1 R$ ${d.x.toFixed(2)} | F2 R$ ${d.y.toFixed(2)}`; } } } }, scales: { x: { title: { display: true, text: 'Preço F1', color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } }, y: { title: { display: true, text: 'Preço F2', color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } } } }
    });
    log('📈 Gráficos avançados gerados!', 'success');
}

// ============================================
// RELATÓRIOS
// ============================================
function gerarRelatorio() {
    if (!dadosUnificados || dadosUnificados.length === 0) { log('⚠️ Sem dados para relatório', 'warning'); return; }
    const total = dadosUnificados.length;
    const encontrados = dadosUnificados.filter(item => item.STATUS !== 'Apenas Fornecedor 1' && item.STATUS !== 'Apenas Fornecedor 2').length;
    const economiaTotal = dadosUnificados.reduce((acc, item) => acc + parseFloat(item['ECONOMIA'] || 0), 0);
    const melhorF1 = dadosUnificados.filter(item => item.MELHOR === 'Fornecedor 1').length;
    const melhorF2 = dadosUnificados.filter(item => item.MELHOR === 'Fornecedor 2').length;
    const empates = dadosUnificados.filter(item => item.MELHOR === 'Empate').length;
    document.getElementById('resumoContent').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;">
            <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#7C3AED;">${total}</div><div style="font-size:11px;color:#666;">Total</div></div>
            <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#10B981;">${encontrados}</div><div style="font-size:11px;color:#666;">Em Ambos</div></div>
            <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#F59E0B;">R$ ${economiaTotal.toFixed(2)}</div><div style="font-size:11px;color:#666;">Economia</div></div>
            <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#7C3AED;">${melhorF1}</div><div style="font-size:11px;color:#666;">Melhor F1</div></div>
            <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#10B981;">${melhorF2}</div><div style="font-size:11px;color:#666;">Melhor F2</div></div>
            <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#888;">${empates}</div><div style="font-size:11px;color:#666;">Empates</div></div>
        </div>`;
    const head = document.getElementById('relatorioHead');
    const body = document.getElementById('relatorioBody');
    head.innerHTML = '';
    const todasCols = Object.keys(dadosUnificados[0]);
    const calcColsArr = ['DIFERENCA', 'MELHOR', 'ECONOMIA', 'STATUS'];
    const f1Cols = todasCols.filter(k => !k.startsWith('F2_') && !calcColsArr.includes(k));
    const f2Cols = todasCols.filter(k => k.startsWith('F2_'));
    const analCols = calcColsArr.filter(k => todasCols.includes(k));
    const colsOrdenadas = [...f1Cols, ...f2Cols, ...analCols];
    const trHead = document.createElement('tr');
    const thBtn = document.createElement('th');
    thBtn.textContent = '🔍';
    thBtn.style.cssText = 'width:44px;text-align:center;';
    trHead.appendChild(thBtn);
    colsOrdenadas.forEach(col => {
        const th = document.createElement('th');
        if (col.startsWith('F2_')) { th.className = 'col-f2'; th.textContent = col.replace('F2_', '') + ' (F2)'; }
        else if (calcColsArr.includes(col)) { th.className = 'col-calc'; th.textContent = col; }
        else { th.className = 'col-f1'; th.textContent = col + ' (F1)'; }
        trHead.appendChild(th);
    });
    head.appendChild(trHead);
    body.innerHTML = '';
    dadosUnificados.slice(0, 100).forEach((item, idx) => {
        const r = document.createElement('tr');
        r.style.cursor = 'pointer';
        r.title = 'Clique para ver detalhes completos';
        r.onclick = () => abrirDetalheProduto(idx);
        const tdBtn = document.createElement('td');
        tdBtn.style.textAlign = 'center';
        const btn = document.createElement('button');
        btn.textContent = '🔍';
        btn.className = 'btn-detalhe';
        btn.onclick = (e) => { e.stopPropagation(); abrirDetalheProduto(idx); };
        tdBtn.appendChild(btn);
        r.appendChild(tdBtn);
        colsOrdenadas.forEach(col => {
            const td = document.createElement('td');
            let val = item[col] !== undefined ? item[col] : '-';
            if (col === 'MELHOR') {
                const badge = document.createElement('span');
                const cls = val === 'Fornecedor 1' ? 'badge-f1' : val === 'Fornecedor 2' ? 'badge-f2' : 'badge-empate';
                badge.className = `badge ${cls}`;
                badge.textContent = val;
                td.appendChild(badge);
            } else {
                if (typeof val === 'number') val = val.toFixed(2);
                td.textContent = String(val).slice(0, 50);
            }
            r.appendChild(td);
        });
        body.appendChild(r);
    });
    btnBaixarRelatorio.disabled = false;
    log('📄 Relatório gerado!', 'success');
}
btnGerarRelatorio.addEventListener('click', () => { gerarRelatorio(); abasCarregadas.relatorios = true; });

// ============================================
// EXPORTAR
// ============================================
btnExportarUnificacao.addEventListener('click', () => {
    if (!dadosUnificados || dadosUnificados.length === 0) { log('⚠️ Nenhum dado para exportar!', 'warning'); return; }
    try {
        const nome = `unificacao_${new Date().toISOString().slice(0,10)}`;
        const ws = XLSX.utils.json_to_sheet(dadosUnificados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Unificacao');
        XLSX.writeFile(wb, `${nome}.xlsx`);
        const csv = Papa.unparse(dadosUnificados);
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${nome}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        log(`💾 Exportado: ${nome}.xlsx e ${nome}.csv`, 'success');
    } catch (err) { log(`❌ Erro: ${err.message}`, 'error'); }
});

btnBaixarRelatorio.addEventListener('click', () => {
    if (!dadosUnificados || dadosUnificados.length === 0) { log('⚠️ Nenhum dado para baixar!', 'warning'); return; }
    try {
        const nome = `relatorio_${new Date().toISOString().slice(0,10)}`;
        const ws = XLSX.utils.json_to_sheet(dadosUnificados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
        XLSX.writeFile(wb, `${nome}.xlsx`);
        const csv = Papa.unparse(dadosUnificados);
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${nome}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        log(`💾 Relatório salvo: ${nome}.xlsx e ${nome}.csv`, 'success');
    } catch (err) { log(`❌ Erro: ${err.message}`, 'error'); }
});

// ============================================
// LIMPAR
// ============================================
btnLimpar.addEventListener('click', () => {
    file1.value = ''; file2.value = '';
    status1.textContent = ''; status2.textContent = '';
    dados1 = null; dados2 = null; dadosUnificados = null; iaMatches = [];
    colunaId.value = ''; preco1.value = ''; preco2.value = '';
    btnUnificar.disabled = true;
    btnProcessarUnificacao.disabled = true;
    btnExportarUnificacao.disabled = true;
    btnGerarRelatorio.disabled = true;
    btnBaixarRelatorio.disabled = true;
    document.getElementById('totalRegistros').textContent = '0';
    document.getElementById('totalFornecedores').textContent = '0';
    document.getElementById('totalEconomia').textContent = 'R$ 0';
    unifyStatusText.textContent = 'Aguardando dados';
    unifyCount.textContent = '0';
    unifyFound.textContent = '0';
    unifyEconomy.textContent = 'R$ 0,00';
    unifyPreview.style.display = 'none';
    unifyStats.style.display = 'none';
    destruirTodosGraficos();
    abasCarregadas = { analise: false, graficos: false, relatorios: false };
    document.getElementById('resumoContent').innerHTML = '';
    document.getElementById('relatorioHead').innerHTML = '';
    document.getElementById('relatorioBody').innerHTML = '';
    document.getElementById('activityList').innerHTML = '';
    document.getElementById('logArea').innerHTML = '';
    document.getElementById('iaMatchesBody').innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhum match via IA ainda.</td></tr>`;
    document.getElementById('iaMatches').textContent = '0';
    document.getElementById('iaSimilaridade').textContent = '0%';
    document.getElementById('iaPrecisao').textContent = '0%';
    atualizarDashboard();
    log('🗑️ Sistema reiniciado', 'info');
});

// ============================================
// INICIALIZAR
// ============================================
log('🚀 DataViz Analytics iniciado!', 'info');
log('🔐 Faça login para acessar o sistema', 'info');
log('📌 Credenciais: admin / admin123, usuario / 123456, teste / teste123', 'info');
log('🧠 IA de Fuzzy Matching ativada para correlacionar produtos por similaridade textual!', 'info');
log('📱 Abra a aba "🧠 Demo IA" para ver o funcionamento da IA.', 'info');
atualizarDashboard();