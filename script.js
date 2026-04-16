const form = document.getElementById('prazoForm');
const tabela = document.getElementById('tabelaPrazos');

form.addEventListener('submit', function(event) {
  event.preventDefault();

  const cliente = document.getElementById('cliente').value;
  const processo = document.getElementById('processo').value;
  const tipo = document.getElementById('tipo').value;
  const dataFatal = document.getElementById('dataFatal').value;
  const responsavel = document.getElementById('responsavel').value;
  const status = document.getElementById('status').value;
  const descricao = document.getElementById('descricao').value;

  const dataFatalObj = new Date(dataFatal);
  const prazoInternoObj = new Date(dataFatalObj);
  prazoInternoObj.setDate(prazoInternoObj.getDate() - 1);

  const prazoInterno = prazoInternoObj.toLocaleDateString('pt-BR');
  const dataFatalFormatada = dataFatalObj.toLocaleDateString('pt-BR');

  const hoje = new Date();
  const diferencaDias = Math.ceil((dataFatalObj - hoje) / (1000 * 60 * 60 * 24));

  const linha = document.createElement('tr');

  if (status === 'Concluído') {
    linha.classList.add('concluido');
  } else if (diferencaDias <= 1) {
    linha.classList.add('urgente');
  } else if (diferencaDias <= 3) {
    linha.classList.add('alerta');
  }

  linha.innerHTML = `
    <td>${cliente}</td>
    <td>${processo}</td>
    <td>${tipo}</td>
    <td>${dataFatalFormatada}</td>
    <td>${prazoInterno}</td>
    <td>${responsavel}</td>
    <td>${status}</td>
    <td>${descricao}</td>
  `;

  tabela.appendChild(linha);

  form.reset();
});
