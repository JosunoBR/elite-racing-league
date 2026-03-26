// Elite Racing League - Arquivo de Dados do Campeonato
//
// InstruÃ§Ãµes para Administradores:
//
// 1.  **Pilotos por Grid**: Para cada grid (ex: "elite_prime_f1_25"),
//     adicione os objetos dos pilotos que participam daquele grid.
//     VocÃª pode copiar os objetos dos pilotos do arquivo `data/pilotos.js`.
//     **Certifique-se de que cada piloto tenha um `id` Ãºnico.**
//
// 2.  **Resultados das Etapas**: Na seÃ§Ã£o `resultados`, cada array representa uma corrida.
//     Dentro do array da corrida, liste os `id`s dos pilotos na ordem em que terminaram.
//     Por exemplo: `[3, 1, 2]` significa que o piloto com id 3 chegou em 1Âº,
//     o piloto com id 1 em 2Âº, e o piloto com id 2 em 3Âº.
//
// 3.  **Etapas**: O nÃºmero de arrays em `resultados` corresponde ao nÃºmero de etapas concluÃ­das.
//
const dadosCampeonato = {
  "elite_prime_f1_25": {
    "nome": "Elite Prime Class F1 25",
    "pilotos": [
      {
        "id": 1,
        "nome": "JoÃ£o Pedro",
        "equipe": "redbull",
        "pontos": 0,
        "foto": "pilotos/1\.jpeg"
      },
      {
        "id": 2,
        "nome": "Victor Brosele",
        "equipe": "ferrari",
        "pontos": 0,
        "foto": "pilotos/2\.jfif"
      },
      {
        "id": 3,
        "nome": "Claiton Esequiel",
        "equipe": "mercedes",
        "pontos": 0,
        "foto": "pilotos/3\.jfif"
      }
    ],
    "resultados": []
  },
  "elite_advanced_f1_25": {
    "nome": "Elite Advanced F1 25",
    "pilotos": [
      {
        "id": 4,
        "nome": "Miguel Angelo",
        "equipe": "astonmartin",
        "pontos": 0,
        "foto": "pilotos/4\.jfif"
      },
      {
        "id": 5,
        "nome": "Gabriel Gaviolli",
        "equipe": "kicksauber",
        "pontos": 0,
        "foto": "pilotos/5\.jpeg"
      },
      {
        "id": 6,
        "nome": "JoÃ£o Gabriel",
        "equipe": "alpine",
        "pontos": 0,
        "foto": "pilotos/6\.jpeg"
      }
    ],
    "resultados": []
  },
  "elite_starter_f1_25": {
    "nome": "Elite Starter Class F1 25",
    "pilotos": [
      {
        "id": 7,
        "nome": "Alam Silveira",
        "equipe": "haas",
        "pontos": 0,
        "foto": "pilotos/7\.jpeg"
      },
      {
        "id": 8,
        "nome": "Rickelme Vales",
        "equipe": "mclaren",
        "pontos": 0,
        "foto": "pilotos/8\.jpeg"
      },
      {
        "id": 9,
        "nome": "Guilherme Dias",
        "equipe": "rb",
        "pontos": 0,
        "foto": "pilotos/9\.jpeg"
      }
    ],
    "resultados": []
  },
  "elite_rookie_4_div": {
    "nome": "Elite Rookie 4Âº DIV",
    "pilotos": [
      {
        "id": 10,
        "nome": "Matheus Peixoto",
        "equipe": "williams",
        "pontos": 0,
        "foto": "pilotos/10\.jpeg"
      },
      {
        "id": 11,
        "nome": "Igor Oliveira",
        "equipe": "redbull",
        "pontos": 0,
        "foto": "pilotos/11\.jpeg"
      },
      {
        "id": 12,
        "nome": "Leonardo Alves",
        "equipe": "ferrari",
        "pontos": 0,
        "foto": "pilotos/12\.jpeg"
      }
    ],
    "resultados": []
  },
  "elite_prime_f1_24": {
    "nome": "Elite Prime Class F1 24",
    "pilotos": [
      {
        "id": 13,
        "nome": "Sidnei Lima",
        "equipe": "mercedes",
        "pontos": 0,
        "foto": "pilotos/13\.jpeg"
      },
      {
        "id": 14,
        "nome": "Davi Bairros",
        "equipe": "astonmartin",
        "pontos": 0,
        "foto": "pilotos/14\.jpeg"
      },
      {
        "id": 15,
        "nome": "Caio Patricio",
        "equipe": "kicksauber",
        "pontos": 0,
        "foto": "pilotos/15\.jfif"
      }
    ],
    "resultados": []
  },
  "elite_academy_f1_25": {
    "nome": "Elite Academy Class F1 25 5Âº DIV",
    "pilotos": [
      {
        "id": 16,
        "nome": "Roger Belon",
        "equipe": "alpine",
        "pontos": 0,
        "foto": "pilotos/16\.jpeg"
      },
      {
        "id": 17,
        "nome": "NatÃ£ Gabriel",
        "equipe": "haas",
        "pontos": 0,
        "foto": "pilotos/17\.jpeg"
      },
      {
        "id": 18,
        "nome": "Glayson Bezerra",
        "equipe": "mclaren",
        "pontos": 0,
        "foto": "pilotos/18\.jpeg"
      }
    ],
    "resultados": []
  }
};

