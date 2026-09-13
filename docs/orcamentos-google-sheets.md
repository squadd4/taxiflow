# Pedidos de orçamento no Google Sheets

O formulário **Pede um orçamento** envia cada pedido para uma folha de cálculo na tua
Google Drive. O site fala com um pequeno script (Google Apps Script) ligado a essa folha,
que grava uma linha por pedido e, se quiseres, envia-te um email de aviso.

Leva cerca de 10 minutos e faz-se uma vez.

## O que fica gravado

Separador **Pedidos**, uma linha por pedido:

| Data/Hora | Nome | Email | Telemóvel | Tipo | Mensagem | Referência | Origem |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 13/09/2026 18:42 | Ana Costa | ana@exemplo.pt | +351 912 345 678 | Empresa | Temos 3 viaturas… | 8d7f0b2e-… | taxiflow-landing |

A **Referência** identifica cada pedido. Se a ligação estiver lenta e o site repetir o
envio, o script reconhece a referência e não duplica a linha.

## 1. Criar a folha de cálculo

1. Em [drive.google.com](https://drive.google.com): **Novo → Google Sheets → Folha de
   cálculo em branco**.
2. Dá-lhe um nome, por exemplo *Taxi Flow — Pedidos de orçamento*.
3. Não é preciso criar colunas: o script cria o separador **Pedidos** e os cabeçalhos no
   primeiro pedido.

## 2. Colar o script

1. Na folha: **Extensões → Apps Script**.
2. Apaga o conteúdo de `Código.gs` e cola todo o ficheiro
   [`integrations/google-sheets/Codigo.gs`](../integrations/google-sheets/Codigo.gs).
3. Guarda (**Ctrl+S**).
4. Em **Definições do projeto** (roda dentada, à esquerda), escolhe o fuso horário
   `Europe/Lisbon` (Hora de Lisboa), para a Data/Hora sair certa.

## 3. Definir o segredo e o email de aviso

1. Gera um segredo (uma sequência aleatória que só o site e o script conhecem):

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```

   Sem Node, serve qualquer gerador de palavras-passe com 30 ou mais caracteres, sem espaços.

2. Em **Definições do projeto → Propriedades do script → Adicionar propriedade do script**:

   | Propriedade | Valor |
   | --- | --- |
   | `WEBHOOK_SECRET` | o segredo que geraste |
   | `NOTIFY_EMAIL` | *(opcional)* email que recebe um aviso por cada pedido; vários separados por vírgulas |

3. **Guardar propriedades do script**.

## 4. Autorizar o script

1. Volta ao **Editor** (`<>` à esquerda). Na barra de cima escolhe a função
   **testarPedido** e carrega em **Executar**.
2. A Google pede autorização. Como o script é teu e não está publicado, aparece o aviso
   *"A Google não validou esta app"*: **Avançadas → Aceder a (nome do projeto) → Permitir**.
3. Confirma que surgiu uma linha de teste no separador **Pedidos** (e o email, se definiste
   `NOTIFY_EMAIL`). Podes apagar essa linha.

## 5. Publicar como aplicação Web

1. **Implementar → Nova implementação**.
2. Em **Selecionar tipo** (roda dentada) escolhe **Aplicação Web**.
3. Preenche:
   - **Executar como:** Eu
   - **Quem tem acesso:** Qualquer pessoa
4. **Implementar** e copia o **URL da aplicação Web** (termina em `/exec`).

*Qualquer pessoa* é necessário para o servidor do site conseguir enviar os pedidos. O URL
não aparece no site e, sem o segredo, o script recusa qualquer envio.

## 6. Ligar o site

Na Vercel, projeto **taxiflow**: **Settings → Environment Variables**, ambiente
**Production** (e **Preview**, se quiseres testar antes):

| Variável | Valor |
| --- | --- |
| `CONTACT_WEBHOOK_URL` | o URL `/exec` do passo 5 |
| `CONTACT_WEBHOOK_SECRET` | o mesmo segredo do passo 3 |
| `CONTACT_EMAIL` | *(opcional)* email mostrado ao cliente se o envio falhar |

As variáveis só entram num novo deploy: **Deployments → ⋯ no deploy mais recente →
Redeploy**. Também dá pela linha de comandos:

```bash
vercel env add CONTACT_WEBHOOK_URL production
```

```bash
vercel env add CONTACT_WEBHOOK_SECRET production
```

Para testar no computador, copia `.env.local.example` para `.env.local` e preenche os
mesmos valores.

## 7. Testar

Substitui `O_TEU_SEGREDO` e `URL_DA_APLICACAO_WEB`:

```bash
curl -L -H "Content-Type: application/json" -d '{"token":"O_TEU_SEGREDO","id":"teste-curl-1","name":"Teste","email":"teste@exemplo.pt","phone":"","type":"motorista","message":"Pedido de teste","source":"curl"}' "URL_DA_APLICACAO_WEB"
```

- `{"ok":true}` — a linha foi gravada.
- `{"ok":true,"duplicate":true}` — essa referência já tinha sido gravada.
- `{"ok":false,"error":"unauthorized"}` — o segredo não coincide.

Depois envia um pedido pelo formulário do site e confirma a linha nova.

## Alterar o script mais tarde

**Implementar → Gerir implementações → ✏️ (editar) → Versão: Nova versão → Implementar.**
O URL mantém-se. Uma *Nova implementação* criaria um URL diferente, que terias de
atualizar na Vercel.

## Se um pedido falhar

- O site tenta enviar duas vezes. Se continuar a falhar, o cliente vê uma mensagem clara e
  os dados ficam preenchidos no formulário para tentar de novo, sem duplicar a linha.
- O pedido completo fica nos logs da Vercel com a etiqueta `[orçamento] NOT DELIVERED`:
  **Project → Logs**, pesquisa `orçamento`. Copia os dados para a folha à mão.
- Respostas do script e o que significam:

  | Erro | Causa | O que fazer |
  | --- | --- | --- |
  | `unauthorized` | segredo diferente no script e na Vercel | igualar `WEBHOOK_SECRET` e `CONTACT_WEBHOOK_SECRET`, fazer redeploy |
  | `not-configured` | falta `WEBHOOK_SECRET` no script | passo 3 |
  | `invalid` | faltam campos obrigatórios | ver o pedido nos logs da Vercel |
  | `script-error` | erro dentro do script | Apps Script → **Execuções** |
  | página HTML em vez de JSON | acesso não está em *Qualquer pessoa*, ou URL errado | passo 5 |
