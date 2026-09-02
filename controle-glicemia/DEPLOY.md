# Publicar o Controle de Glicemia na Google Play

Este app é um PWA (site que funciona como app). Para virar um app de verdade
na Play Store sem reescrever nada, usamos o caminho oficial do Google:
**TWA — Trusted Web Activity**. Ela empacota este mesmo site dentro de um
app Android real, que abre em tela cheia (sem barra de navegador).

Arquitetura já preparada no código:

- **Hospedagem**: Firebase Hosting (gratuito, HTTPS, do próprio Google).
- **Identificação de usuário**: Login com Google (`auth.js`), com um perfil
  local sem internet como alternativa.
- **Armazenamento**: tudo fica no `localStorage` do aparelho, separado por
  usuário. Nenhum dado é enviado a servidor nenhum.
- **Exportação**: JSON (backup completo), CSV (planilha), TXT e Word (.doc).
- **Tema**: claro/escuro/sistema, com alternância manual no cabeçalho.

Faltam só as etapas abaixo, que dependem da sua conta Google — não consigo
fazer por você.

---

## 1. Criar o projeto no Firebase (Google Cloud)

1. Acesse https://console.firebase.google.com e crie um projeto novo (ex:
   `controle-glicemia`).
2. Não precisa ativar nenhum produto além do Hosting — não usamos banco de
   dados nem funções.

## 2. Criar o Client ID do Google Sign-In

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   selecione o **mesmo projeto** criado no Firebase.
2. Vá em **APIs e serviços → Tela de consentimento OAuth**: escolha
   "Externo", preencha nome do app ("Controle de Glicemia"), e-mail de
   suporte e logo (pode usar `icons/icon-512.png`).
3. Vá em **Credenciais → Criar credenciais → ID do cliente OAuth**.
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Origens JavaScript autorizadas: `https://SEU-PROJETO.web.app` (o
     domínio que o Firebase Hosting vai te dar no passo 3 — pode voltar
     aqui depois para adicionar).
4. Copie o **Client ID** gerado (termina em `.apps.googleusercontent.com`).
5. Abra `auth.js` e troque a linha:
   ```js
   var GOOGLE_CLIENT_ID = "REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com";
   ```
   pelo seu Client ID real.

> **Sobre segurança**: esse login apenas identifica qual perfil local abrir
> no aparelho — não existe servidor validando a sessão, porque os dados
> nunca saem do aparelho. É o suficiente para separar o uso entre pessoas
> da família no mesmo celular, mas não é uma barreira contra alguém com
> acesso físico ao aparelho e conhecimento técnico. Se no futuro você quiser
> sincronizar dados entre aparelhos, aí sim entra um backend de verdade.

## 3. Publicar no Firebase Hosting

No seu computador (não precisa ser aqui):

```bash
npm install -g firebase-tools
firebase login
cd anotacoes
firebase deploy --only hosting
```

Antes de rodar, edite `.firebaserc` na raiz do repositório e troque
`REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID` pelo ID do projeto criado no passo 1.

O comando publica a pasta `controle-glicemia/` inteira na raiz de
`https://SEU-PROJETO.web.app`. Esse é o endereço final do app — é ele que
vai nas origens do passo 2 e no gerador de TWA do passo 4.

## 4. Gerar o pacote Android (.aab)

Forma mais simples, sem precisar instalar Android Studio: **PWABuilder**.

1. Acesse https://www.pwabuilder.com e cole a URL `https://SEU-PROJETO.web.app`.
2. Clique em "Start" — ele valida o `manifest.webmanifest` e o service worker
   (já estão prontos no projeto).
3. Na aba **Android**, gere o pacote para a **Google Play**. O PWABuilder
   cria (ou permite enviar) a chave de assinatura do app e mostra o
   **SHA-256 do certificado de assinatura** — copie esse valor e o **nome do
   pacote** (ex: `com.seudominio.controleglicemia`).
4. Baixe o `.aab` (Android App Bundle) gerado.

Guarde a chave de assinatura em local seguro — é ela que permite publicar
atualizações do app depois.

## 5. Confirmar a ligação entre o site e o app (Digital Asset Links)

1. Edite `controle-glicemia/.well-known/assetlinks.json` e troque:
   - `package_name` pelo nome do pacote do passo 4;
   - `sha256_cert_fingerprints` pelo SHA-256 do passo 4.
2. Publique de novo: `firebase deploy --only hosting`.
3. Confira em:
   `https://SEU-PROJETO.web.app/.well-known/assetlinks.json`
   e valide em
   https://developers.google.com/digital-asset-links/tools/generator
   (isso é o que faz o app abrir sem a barra de endereço do navegador).

## 6. Publicar no Play Console

Você já tem a conta (taxa única de US$ 25 já paga). No
[Play Console](https://play.google.com/console):

1. **Criar app** → preencha nome, idioma, categoria "Saúde e fitness" ou
   "Estilo de vida".
2. **Política de privacidade**: obrigatória para apps de saúde. Você
   precisa de uma página pública explicando que os dados ficam só no
   aparelho e não são coletados por você. Posso redigir esse texto se
   quiser — me avise.
3. **Formulário de segurança dos dados** (Data Safety): declare que o app
   **não coleta nem compartilha dados** (tudo fica local no aparelho).
4. Envie o `.aab` do passo 4 em **Teste interno** primeiro, teste no seu
   celular, e só depois promova para produção.
5. Classificação de conteúdo, ícone da loja (pode usar
   `icons/icon-512.png`) e capturas de tela (posso gerar para você quando
   o app já estiver publicado no domínio).

---

## O que eu preciso que você me diga

Assim que tiver os dois valores abaixo, me envie que eu termino o resto:

1. A **URL final do Firebase Hosting** (`https://SEU-PROJETO.web.app`).
2. O **Client ID do Google Sign-In** do passo 2.

Com isso eu atualizo `auth.js`, confirmo os textos de política de
privacidade e deixo tudo revisado antes do envio ao Play Console.
