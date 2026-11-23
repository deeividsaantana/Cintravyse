import type { jsPDF } from './pdfLoader';
import { gerarEmUmaFolha } from './pdfUmaFolha';

/**
 * Lista de pessoas para baixar (pedido de 23/11/2026): a lista de
 * colaboradores filtrada, ou os membros de uma equipe, em Excel ou em PDF de
 * uma folha só.
 */
export interface PessoaParaExportar {
  nome: string;
  matricula: string;
  cargo: string;
  equipe: string;
  lider: string;
  situacao: string;
}

export interface ListaParaExportar {
  titulo: string;
  /** Linha abaixo do título: frente, encarregado, filtro escolhido. */
  subtitulo?: string;
  pessoas: PessoaParaExportar[];
}

const COLUNAS: ReadonlyArray<{ id: keyof PessoaParaExportar; rotulo: string; peso: number }> = [
  { id: 'nome', rotulo: 'Nome', peso: 3.2 },
  { id: 'matricula', rotulo: 'Matrícula', peso: 1.1 },
  { id: 'cargo', rotulo: 'Cargo', peso: 2.2 },
  { id: 'equipe', rotulo: 'Equipe', peso: 2 },
  { id: 'lider', rotulo: 'Responde a', peso: 2.2 },
  { id: 'situacao', rotulo: 'Situação', peso: 1.2 },
];

const hoje = () => {
  const data = new Date();
  return {
    arquivo: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`,
    tela: data.toLocaleDateString('pt-BR'),
  };
};

/** Nome de arquivo sem acento nem espaço: "Equipe da Fábrica" vira "EQUIPE_DA_FABRICA". */
export const nomeDeArquivo = (titulo: string) => titulo
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .toUpperCase() || 'PESSOAS';

export async function baixarExcelPessoas(lista: ListaParaExportar) {
  const { autoFitCorporateColumns, createCorporateWorkbook, downloadCorporateWorkbook, styleCorporateWorksheet } = await import('./excelCorporate');
  const planilha = await createCorporateWorkbook();
  const aba = planilha.addWorksheet(lista.titulo.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Pessoas');
  aba.addRow(COLUNAS.map(coluna => coluna.rotulo));
  lista.pessoas.forEach(pessoa => aba.addRow(COLUNAS.map(coluna => pessoa[coluna.id] || '')));
  styleCorporateWorksheet(aba, { title: lista.titulo, headerRow: 1, freezeRows: 1, recordCount: lista.pessoas.length });
  autoFitCorporateColumns(aba);
  await downloadCorporateWorkbook(planilha, `${nomeDeArquivo(lista.titulo)}_${hoje().arquivo}.xlsx`);
}

/** Corta o texto para caber na coluna, com reticências. */
const caber = (doc: jsPDF, texto: string, largura: number) => {
  if (doc.getTextWidth(texto) <= largura) return texto;
  let corte = texto;
  while (corte.length > 1 && doc.getTextWidth(`${corte}...`) > largura) corte = corte.slice(0, -1);
  return `${corte}...`;
};

const desenhar = (doc: jsPDF, lista: ListaParaExportar) => {
  const largura = doc.internal.pageSize.getWidth();
  const margem = 12;
  const util = largura - margem * 2;
  const soma = COLUNAS.reduce((total, coluna) => total + coluna.peso, 0);
  const larguras = COLUNAS.map(coluna => (coluna.peso / soma) * util);
  let y = margem;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(lista.titulo, margem, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(91, 104, 112);
  const linhaDeBaixo = [lista.subtitulo, `${lista.pessoas.length} ${lista.pessoas.length === 1 ? 'pessoa' : 'pessoas'}`, `Gerado em ${hoje().tela}`].filter(Boolean).join(' · ');
  doc.text(linhaDeBaixo, margem, y + 12);
  y += 18;

  const alturaLinha = 7;
  doc.setFillColor(23, 107, 77);
  doc.rect(margem, y, util, alturaLinha, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  let x = margem;
  COLUNAS.forEach((coluna, indice) => {
    doc.text(coluna.rotulo, x + 2, y + 4.8);
    x += larguras[indice];
  });
  y += alturaLinha;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  lista.pessoas.forEach((pessoa, linha) => {
    if (linha % 2 === 1) {
      doc.setFillColor(243, 246, 244);
      doc.rect(margem, y, util, alturaLinha, 'F');
    }
    let coluna = margem;
    COLUNAS.forEach((item, indice) => {
      doc.text(caber(doc, pessoa[item.id] || '-', larguras[indice] - 4), coluna + 2, y + 4.8);
      coluna += larguras[indice];
    });
    y += alturaLinha;
  });
  if (lista.pessoas.length === 0) {
    doc.setTextColor(91, 104, 112);
    doc.text('Ninguém nesta lista.', margem + 2, y + 5);
    y += alturaLinha;
  }
  return y + margem;
};

export async function baixarPdfPessoas(lista: ListaParaExportar) {
  const doc = await gerarEmUmaFolha({ orientacao: 'landscape' }, folha => desenhar(folha, lista));
  doc.save(`${nomeDeArquivo(lista.titulo)}_${hoje().arquivo}.pdf`);
}
