# Diagrama

App desktop para Windows (Electron + React + TypeScript) que gera diagramas de topologia de rede a partir de uma descrição em texto livre — usando uma IA que roda **localmente** via [Ollama](https://ollama.com), sem chave de API e sem custo por uso. O resultado é um diagrama totalmente editável: arraste dispositivos, redesenhe conexões, edite IPs/VLANs, agrupe em caixas visuais, e por aí vai.

## Instalação (um comando)

Abra o PowerShell e rode:

```powershell
irm https://raw.githubusercontent.com/nienowjux-hash/diagrama/main/install.ps1 | iex
```

Isso baixa o instalador mais recente e abre o assistente de instalação do Windows.

Ou baixe manualmente o `.exe` mais recente na página de [Releases](https://github.com/nienowjux-hash/diagrama/releases).

### Pré-requisitos para gerar diagramas com IA

- [Ollama](https://ollama.com) instalado e rodando.
- Um modelo baixado, por exemplo:
  ```
  ollama pull qwen2.5:7b
  ```
  (`llama3.2:3b` é uma opção mais leve para GPUs mais fracas.)

Sem o Ollama rodando, o app ainda funciona normalmente para criar/editar diagramas manualmente — só a geração por IA fica indisponível.

## Como usar

Descreva a infraestrutura no painel à esquerda (ex: "2 servidores, 1 NAS, 1 firewall, 4 switches, VPN entre matriz e filial, VLANs de dados e voz") e o diagrama é montado automaticamente, atualizando em tempo real conforme a IA gera. Depois é só editar à vontade: adicionar/remover dispositivos pela paleta, redesenhar conexões, ajustar IP/VLAN/portas, agrupar em caixas visuais, desfazer/refazer, salvar em JSON, exportar como PNG/SVG/PDF ou como planilha de inventário.

## Desenvolvimento

```powershell
git clone https://github.com/nienowjux-hash/diagrama.git
cd diagrama
npm install
npm run dev          # abre o app em modo desenvolvimento
npm run typecheck    # checagem de tipos
npm run test         # suíte de testes (Vitest)
npm run build:win    # gera o instalador em release/DiagramaSetup.exe
```

Mais detalhes de arquitetura em [CLAUDE.md](./CLAUDE.md).
