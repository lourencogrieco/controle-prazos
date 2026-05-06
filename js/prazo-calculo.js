"use strict";

// ──────────────────────────────────────────────────────────────────────
// CÁLCULO JURÍDICO DE PRAZOS
// Primeira versão: dias úteis nacionais + feriados móveis + recesso forense.
// Regra aplicada: exclui o dia da publicação/intimação e conta a partir do
// próximo dia útil. A data final também precisa cair em dia útil.
// ──────────────────────────────────────────────────────────────────────

(function initPrazoJuridico(global) {
  const TIPOS_DIAS_UTEIS = {
    "Agravo": 15,
    "Agravo em Recurso Especial": 15,
    "Agravo em Recurso Extraordinário": 15,
    "Agravo Interno": 15,
    "Contestação": 15,
    "Embargos de Declaração": 5,
    "Manifestação": 15,
    "Recurso de Apelação": 15,
    "Recurso Especial": 15,
    "Recurso Extraordinário": 15,
    "Réplica": 15,
  };

  function parseISODate(iso) {
    if (!iso) return null;
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDays(date, amount) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + amount);
    return d;
  }

  function easterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const mm = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * mm + 114) / 31);
    const day = ((h + l - 7 * mm + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function feriadosNacionais(year) {
    const pascoa = easterDate(year);
    const fixos = [
      `${year}-01-01`,
      `${year}-04-21`,
      `${year}-05-01`,
      `${year}-09-07`,
      `${year}-10-12`,
      `${year}-11-02`,
      `${year}-11-15`,
      `${year}-11-20`,
      `${year}-12-25`,
    ];
    const moveis = [
      addDays(pascoa, -48), // segunda de carnaval
      addDays(pascoa, -47), // terça de carnaval
      addDays(pascoa, -2),  // sexta-feira santa
      addDays(pascoa, 60),  // Corpus Christi
    ].map(toISODate);
    return new Set([...fixos, ...moveis]);
  }

  function isFimDeSemana(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function isRecessoForense(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return (month === 12 && day >= 20) || (month === 1 && day <= 20);
  }

  function isDiaUtil(date) {
    if (isFimDeSemana(date) || isRecessoForense(date)) return false;
    return !feriadosNacionais(date.getFullYear()).has(toISODate(date));
  }

  function proximoDiaUtil(date) {
    let d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    while (!isDiaUtil(d)) d = addDays(d, 1);
    return d;
  }

  function diaUtilAnterior(dataISO) {
    const data = parseISODate(dataISO);
    if (!data) return null;
    let cursor = addDays(data, -1);
    while (!isDiaUtil(cursor)) cursor = addDays(cursor, -1);
    return toISODate(cursor);
  }

  function calcularPrazo(dataBaseISO, diasUteis) {
    const base = parseISODate(dataBaseISO);
    const dias = Number(diasUteis);
    if (!base || !dias || dias < 1) return null;

    let cursor = proximoDiaUtil(addDays(base, 1));
    let contados = 1;
    while (contados < dias) {
      cursor = addDays(cursor, 1);
      if (isDiaUtil(cursor)) contados++;
    }
    return toISODate(cursor);
  }

  function diasUteisPorTipo(tipo) {
    return TIPOS_DIAS_UTEIS[tipo] || null;
  }

  function sugerirPrazo({ tipo, dataBase }) {
    const diasUteis = diasUteisPorTipo(tipo);
    if (!diasUteis || !dataBase) return null;
    const dataFatal = calcularPrazo(dataBase, diasUteis);
    if (!dataFatal) return null;
    return { dataFatal, diasUteis, regra: `${diasUteis} dias úteis` };
  }

  global.PrazoJuridico = {
    calcularPrazo,
    diaUtilAnterior,
    diasUteisPorTipo,
    feriadosNacionais,
    isDiaUtil,
    sugerirPrazo,
  };
})(window);
