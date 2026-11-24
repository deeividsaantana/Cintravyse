/**
 * Nos arquivos que o sistema gera (Excel e PDF), máquina de terceiro sai como
 * "Equipamento de Outro Contrato". O cadastro antigo da planilha do diesel chama essas
 * máquinas de "Equipamento locado", com a empresa "Locado (empresa a
 * confirmar)", e o prefixo sem cadastro saía como "NÃO CADASTRADO". O cliente
 * lia isso como máquina alugada pela RENEA. A tela continua igual.
 */
export const OUTRO_CONTRATO = 'Equipamento de Outro Contrato';

// A família "Locado", quando é o texto inteiro, também troca.
const TERMOS = /equipamento locado|locado \(empresa a confirmar\)|n[ãa]o cadastrado|^\s*locados?\s*$/gi;

/** Troca os nomes genéricos de máquina de terceiro por "Equipamento de Outro Contrato". */
export const paraRelatorio = (texto: string) => texto.replace(TERMOS, OUTRO_CONTRATO);

/** Descrição ou empresa da máquina no relatório: vazio também é "Equipamento de Outro Contrato". */
export const nomeNoRelatorio = (nome?: string) => (nome?.trim() ? paraRelatorio(nome) : OUTRO_CONTRATO);
