# collectNewsData

Le but de ce script est de récolter des données provenant de différents sites WordPress.
Ces données sont transmises à l'ELK de camptocamp et, au final, visibles dans un dashboard de Kibana.

Grâce à ces données, le but final est de déterminer le délai d'affichage des news dans un site WordPress en fonction des caches utilisés à savoir Cloudflare et Varnish.

## Sites WordPress "scrapés"

- l'API Rest de l'application https://actu.epfl.ch
- de différents sites WordPress utilisant le bloc gutenberg des actualités

## Comment les données sont transmises à ELK

Les données sont transmises à ELK (Elasticsearch, Logstash et Kibana) de camptocamp en faisant simplement un `console.log()`.

## Ajout d'un nouveau champ

Lorsque l'on ajoute un nouveau champ, il faut prévenir camptocamp et plus particulièrement Christophe Burki pour qu'il raffraîchisse de son côté.

## Déploiement d'une nouvelle version

1. commiter / pusher les derniers changements
2. Déployer via ansible `./ansible/newsdelaysible`
3. Builder via l'interface web. Pour cela, se rendre à cette adresse: https://pub-os-exopge.epfl.ch/console/project/wwp-test/browse/builds/newsdelay-nodejs?tab=history et cliquer sur le bouton `Start Build`. Attendre quelques secondes que le build se fasse, que le pod redémarre et c'est ok.

=> La dernière version du script est maintenant déployée.
