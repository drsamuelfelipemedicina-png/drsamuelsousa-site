# Site médico — Dr. Samuel Sousa

Site institucional estático com fotos, layout responsivo, consultas online (R$ 270) e domiciliares (R$ 400). Agendamento por e-mail: dr.samuelfelipe.medicina@gmail.com.

## Publicação no GitHub Pages

Em Settings → Pages, selecione Deploy from a branch, branch main e pasta / (root), e salve.

O arquivo CNAME contém drsamuelsousa.com.br. A publicação nesse endereço depende da configuração do domínio e do DNS. Confira o diagnóstico e as instruções exibidas em Settings → Pages. Ative Enforce HTTPS assim que o certificado estiver disponível.

## Arquivos

- index.html: conteúdo e valores das consultas.
- styles.css: layout, cores e responsividade.
- script.js: menu, animações e ano do rodapé.
- assets/: fotos profissionais.
- politica-de-privacidade.html: informações sobre privacidade.
- CNAME, robots.txt e sitemap.xml: domínio e indexação.

Para testar localmente: python3 -m http.server 8000, executado nesta pasta.
