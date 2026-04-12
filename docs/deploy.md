# Deploy — HostGator + Supabase

## Visão Geral

| Camada | Onde fica |
|---|---|
| Frontend (React build) | HostGator (hospedagem compartilhada) |
| Backend / Banco | Supabase (projeto dedicado) |
| Edge Functions | Supabase (Deno) |
| Domínio | cineads.com.br (Registro.br) |

## 1. Build de Produção

```sh
npm run build
```

Gera a pasta `dist/` com os arquivos estáticos.

## 2. Deploy no HostGator

1. Acesse o **Gerenciador de Arquivos** no cPanel do HostGator
2. Navegue até `public_html/` (ou o domínio configurado)
3. Faça upload de **todo o conteúdo** da pasta `dist/`
4. Certifique-se de que o arquivo `.htaccess` abaixo existe na raiz:

```apacheconf
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

> Esse arquivo é necessário para que o React Router funcione corretamente (roteamento no lado do cliente). Sem ele, ao acessar qualquer rota diretamente (ex: `/dashboard`) retorna 404.

## 3. Configurar Domínio

No painel do Registro.br, aponte o DNS do `cineads.com.br` para os servidores do HostGator.

## 4. Deploy das Edge Functions

```sh
npx supabase functions deploy ml-exchange-token
npx supabase functions deploy ml-sync-orders
npx supabase functions deploy ml-token-refresh
```

## 5. Redirect URI do Mercado Livre

No painel de desenvolvedor do Mercado Livre, a URI de redirecionamento deve ser:

```
https://www.cineads.com.br/auth/mercadolivre/callback
```

## Checklist pós-deploy

- [ ] Variáveis de ambiente do Supabase configuradas (`.env` na máquina local, não sobe para o servidor)
- [ ] Migrações aplicadas (`npx supabase db push --include-all`)
- [ ] `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;` executado
- [ ] Vault configurado com `service_role_key`
- [ ] `.htaccess` presente em `public_html/`
- [ ] Redirect URI do ML atualizada no painel do desenvolvedor
- [ ] Edge Functions deployadas
