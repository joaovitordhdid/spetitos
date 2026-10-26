/* Cardápio copiado de instadelivery.com.br/spetitoslanches em 26/10/2026.
   Fotos: CDN do InstaDelivery. Adicionais dos sanduíches montados a partir da categoria PORÇÕES/CREMES;
   ajuste no painel do dono. Taxa de entrega e pedido mínimo: valores iniciais editáveis. */
window.SPETITOS_SEED = {
 "version": 3,
 "sharedGroups": {
  "adicionais": {
   "id": "g-adicionais",
   "name": "Adicionais",
   "min": 0,
   "max": 6,
   "repeat": true,
   "options": [
    {
     "id": "o-hamburguer",
     "name": "Hambúrguer",
     "price": 5.0
    },
    {
     "id": "o-ovo",
     "name": "Ovo",
     "price": 4.0
    },
    {
     "id": "o-salsicha",
     "name": "Salsicha",
     "price": 3.0
    },
    {
     "id": "o-presunto",
     "name": "Presunto",
     "price": 2.0
    },
    {
     "id": "o-mussarela",
     "name": "Mussarela",
     "price": 2.0
    },
    {
     "id": "o-salada",
     "name": "Salada",
     "price": 1.0
    },
    {
     "id": "o-cebola",
     "name": "Cebola",
     "price": 2.0
    },
    {
     "id": "o-repolho",
     "name": "Repolho",
     "price": 2.0
    },
    {
     "id": "o-milho",
     "name": "Milho",
     "price": 1.0
    },
    {
     "id": "o-batata-palha",
     "name": "Batata Palha",
     "price": 1.0
    },
    {
     "id": "o-cream-cheese",
     "name": "Cream Cheese",
     "price": 4.0
    },
    {
     "id": "o-creme-de-catupiry",
     "name": "Creme de Catupiry",
     "price": 4.0
    },
    {
     "id": "o-creme-de-cheddar",
     "name": "Creme de Cheddar",
     "price": 4.0
    }
   ]
  }
 },
 "store": {
  "name": "Spetitos",
  "slogan": "Lanches, burgers e açaí na chapa quente",
  "logo": "",
  "cover": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/stores/background/175882192768d57e27294ca.png",
  "address": "Aracaju - SE",
  "phone": "(79) 99606-9772",
  "whatsapp": "5579996069772",
  "hours": "17:50–23:30",
  "deliveryFee": 5,
  "minOrder": 10,
  "etaMin": 30,
  "etaMax": 50
 },
 "categories": [
  {
   "id": "c-burger-special",
   "name": "Burger Special",
   "order": 1
  },
  {
   "id": "c-ofertas-do-ano",
   "name": "Ofertas DO Ano",
   "order": 2
  },
  {
   "id": "c-sanduiches",
   "name": "Sanduíches",
   "order": 3
  },
  {
   "id": "c-hot-dog",
   "name": "Hot Dog",
   "order": 4
  },
  {
   "id": "c-sanduiches-de-calabresa",
   "name": "Sanduíches DE Calabresa",
   "order": 5
  },
  {
   "id": "c-sanduiches-bacon",
   "name": "Sanduíches Bacon",
   "order": 6
  },
  {
   "id": "c-sanduiches-de-frango",
   "name": "Sanduíches DE Frango",
   "order": 7
  },
  {
   "id": "c-sanduiches-especiais",
   "name": "Sanduíches Especiais",
   "order": 8
  },
  {
   "id": "c-sanduiches-de-coracao",
   "name": "Sanduíches DE Coração",
   "order": 9
  },
  {
   "id": "c-sanduiches-de-file",
   "name": "Sanduíches DE Filé",
   "order": 10
  },
  {
   "id": "c-sanduiches-de-toscana",
   "name": "Sanduíches DE Toscana",
   "order": 11
  },
  {
   "id": "c-bebidas",
   "name": "Bebidas",
   "order": 12
  },
  {
   "id": "c-acompanhamentos",
   "name": "Acompanhamentos",
   "order": 13
  },
  {
   "id": "c-opcao-vegetariana",
   "name": "Opção Vegetariana",
   "order": 14
  },
  {
   "id": "c-cremes",
   "name": "Cremes",
   "order": 15
  },
  {
   "id": "c-acai",
   "name": "Açaí",
   "order": 16
  },
  {
   "id": "c-porcoes",
   "name": "Porções",
   "order": 17
  }
 ],
 "products": [
  {
   "id": "p-duplo",
   "catId": "c-burger-special",
   "name": "Duplo",
   "desc": "Pão selado na chapa com manteiga, 2 burguer de 120g, 2 fatias de queijo cheddar, molho barbecue",
   "price": 35.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877681268d4cdeca8669_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão selado na chapa com manteiga",
     "removable": false
    },
    {
     "name": "2 burguer de 120g",
     "removable": true
    },
    {
     "name": "2 fatias de queijo cheddar",
     "removable": true
    },
    {
     "name": "Molho barbecue",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ],
   "tag": "Destaque"
  },
  {
   "id": "p-so-o-basico",
   "catId": "c-burger-special",
   "name": "Só o Básico",
   "desc": "Pão brioche, blend bovino 120g, alface, tomate, molho de ervas",
   "price": 20.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877708668d4cefe333e0_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão brioche",
     "removable": false
    },
    {
     "name": "Blend bovino 120g",
     "removable": true
    },
    {
     "name": "Alface",
     "removable": true
    },
    {
     "name": "Tomate",
     "removable": true
    },
    {
     "name": "Molho de ervas",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-gg-burger",
   "catId": "c-burger-special",
   "name": "GG Burger",
   "desc": "Pão brioche, 2 blends bovinos, mussarela, alface americana, tomate e cebola",
   "price": 35.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877754668d4d0cad206b_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão brioche",
     "removable": false
    },
    {
     "name": "2 blends bovinos",
     "removable": true
    },
    {
     "name": "Mussarela",
     "removable": true
    },
    {
     "name": "Alface americana",
     "removable": true
    },
    {
     "name": "Tomate",
     "removable": true
    },
    {
     "name": "Cebola",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-matuto",
   "catId": "c-burger-special",
   "name": "Matuto",
   "desc": "Pão brioche, blend bovino 120g, cream cheese, charque, cebola roxa, queijo coalho",
   "price": 38.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877710568d4cf113eeb5_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão brioche",
     "removable": false
    },
    {
     "name": "Blend bovino 120g",
     "removable": true
    },
    {
     "name": "Cream cheese",
     "removable": true
    },
    {
     "name": "Charque",
     "removable": true
    },
    {
     "name": "Cebola roxa",
     "removable": true
    },
    {
     "name": "Queijo coalho",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ],
   "tag": "Novo"
  },
  {
   "id": "p-o-bbq",
   "catId": "c-burger-special",
   "name": "O BBQ",
   "desc": "Pão brioche, molho barbecue, blend bovino 120g, queijo cheddar fatiado",
   "price": 25.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877685468d4ce1686585_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão brioche",
     "removable": false
    },
    {
     "name": "Molho barbecue",
     "removable": true
    },
    {
     "name": "Blend bovino 120g",
     "removable": true
    },
    {
     "name": "Queijo cheddar fatiado",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-burger-bacon",
   "catId": "c-burger-special",
   "name": "Burger Bacon",
   "desc": "Pão brioche, molho especial, blend bovino 120g, bacon, creme de cheddar",
   "price": 30.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877687168d4ce27412d1_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão brioche",
     "removable": false
    },
    {
     "name": "Molho especial",
     "removable": true
    },
    {
     "name": "Blend bovino 120g",
     "removable": true
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Creme de cheddar",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-combo-1",
   "catId": "c-ofertas-do-ano",
   "name": "Combo 1",
   "desc": "1 Eggs burguer, 1 fritas P, 1 mini pet",
   "price": 24.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/17855935246a6dfeb4bae17_75_75.jpeg",
   "ingredients": [],
   "optionGroups": [],
   "tag": "Oferta"
  },
  {
   "id": "p-combo-2",
   "catId": "c-ofertas-do-ano",
   "name": "Combo 2",
   "desc": "2 Eggs, Guaraná 1 litro",
   "price": 37.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/17855936126a6dff0c345a2_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-combo-4",
   "catId": "c-ofertas-do-ano",
   "name": "Combo 4",
   "desc": "4 X burgueres, 1 guaraná 1 litro",
   "price": 50.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/17855937106a6dff6e3cff8_75_75.jpeg",
   "ingredients": [],
   "optionGroups": [],
   "tag": "Oferta"
  },
  {
   "id": "p-hamburgao",
   "catId": "c-sanduiches",
   "name": "Hamburgão",
   "desc": "Pão selado, 2 hambúrgueres, salada e cheddar cremoso",
   "price": 20.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877688968d4ce393dbe5_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão selado",
     "removable": false
    },
    {
     "name": "2 hambúrgueres",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Cheddar cremoso",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-misto",
   "catId": "c-sanduiches",
   "name": "Misto",
   "desc": "Pão, queijo e presunto",
   "price": 8.5,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175882156968d57cc1d01ea_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-x-burguer",
   "catId": "c-sanduiches",
   "name": "X Burguer",
   "desc": "Pão, hambúrguer, queijo, presunto, salada, milho e batata palha",
   "price": 12.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175882142468d57c30b37d3_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Hambúrguer",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-hamburguer",
   "catId": "c-sanduiches",
   "name": "Hamburguer",
   "desc": "Pão, hambúrguer, salada, milho e batata palha",
   "price": 9.5,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175882130468d57bb874429_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Hambúrguer",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-americano",
   "catId": "c-sanduiches",
   "name": "Americano",
   "desc": "Pão, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 11.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-eggs",
   "catId": "c-sanduiches",
   "name": "Eggs",
   "desc": "Pão, hambúrguer, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 15.5,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175882132968d57bd108027_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Hambúrguer",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-lula-burg",
   "catId": "c-sanduiches",
   "name": "Lula Burg",
   "desc": "(Atenção! Mudamos a carne desse burguer) Pão com manteiga tostado na chapa, hambúrguer, queijo, salada",
   "price": 16.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175882135468d57bea35daf_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão com manteiga tostado na chapa",
     "removable": false
    },
    {
     "name": "Hambúrguer",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-triplo-cheddar",
   "catId": "c-sanduiches",
   "name": "Triplo Cheddar",
   "desc": "Pão selado, 3 carnes de hambúrguer, cheddar cremoso",
   "price": 24.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877690568d4ce498ac90_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão selado",
     "removable": false
    },
    {
     "name": "3 carnes de hambúrguer",
     "removable": true
    },
    {
     "name": "Cheddar cremoso",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-triplo-x",
   "catId": "c-sanduiches",
   "name": "Triplo X",
   "desc": "Pão, 3 hambúrgueres, 3 queijos, 3 presuntos e salada",
   "price": 26.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175882139868d57c166d720_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "3 hambúrgueres",
     "removable": true
    },
    {
     "name": "3 queijos",
     "removable": true
    },
    {
     "name": "3 presuntos",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-scooby",
   "catId": "c-hot-dog",
   "name": "Scooby",
   "desc": "Pão, salsicha ao molho da casa, alface, milho, batata palha, catchup, mostarda e queijo ralado",
   "price": 9.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877802868d4d2ac7b681_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Salsicha ao molho da casa",
     "removable": true
    },
    {
     "name": "Alface",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    },
    {
     "name": "Catchup",
     "removable": true
    },
    {
     "name": "Mostarda",
     "removable": true
    },
    {
     "name": "Queijo ralado",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-scooby-doo",
   "catId": "c-hot-dog",
   "name": "Scooby-Doo",
   "desc": "Pão, 2 salsichas ao molho da casa, alface, milho, batata palha, catchup, mostarda e queijo ralado",
   "price": 10.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877801368d4d29da17e7_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "2 salsichas ao molho da casa",
     "removable": true
    },
    {
     "name": "Alface",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    },
    {
     "name": "Catchup",
     "removable": true
    },
    {
     "name": "Mostarda",
     "removable": true
    },
    {
     "name": "Queijo ralado",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-scooby-frango",
   "catId": "c-hot-dog",
   "name": "Scooby Frango",
   "desc": "Pão, frango, salsicha ao molho da casa, alface, milho, batata palha, catchup, mostarda e queijo ralado",
   "price": 18.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877798068d4d27c5a60a_75_75.jpeg",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Salsicha ao molho da casa",
     "removable": true
    },
    {
     "name": "Alface",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    },
    {
     "name": "Catchup",
     "removable": true
    },
    {
     "name": "Mostarda",
     "removable": true
    },
    {
     "name": "Queijo ralado",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-dog-supremo",
   "catId": "c-hot-dog",
   "name": "Dog Supremo",
   "desc": "",
   "price": 20.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/175877804868d4d2c03da28_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-x-calabresa",
   "catId": "c-sanduiches-de-calabresa",
   "name": "X Calabresa",
   "desc": "Pão, calabresa, queijo, presunto, salada, milho e batata palha",
   "price": 18.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-calabresa-acebolado",
   "catId": "c-sanduiches-de-calabresa",
   "name": "Calabresa Acebolado",
   "desc": "Pão, calabresa, cebola, queijo, presunto, salada, milho e batata palha",
   "price": 19.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Cebola",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-eggs-calabresa",
   "catId": "c-sanduiches-de-calabresa",
   "name": "Eggs Calabresa",
   "desc": "Pão, calabresa, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 21.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-frango-calabresa",
   "catId": "c-sanduiches-de-calabresa",
   "name": "Frango Calabresa",
   "desc": "Pão, calabresa, frango, queijo, presunto, salada, milho e batata palha",
   "price": 25.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-x-bacon",
   "catId": "c-sanduiches-bacon",
   "name": "X Bacon",
   "desc": "Pão, bacon, queijo, presunto, salada, milho e batata palha",
   "price": 21.5,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-bacon-calabresa",
   "catId": "c-sanduiches-bacon",
   "name": "Bacon Calabresa",
   "desc": "Pão, bacon, calabresa, queijo, presunto, salada, milho e batata palha",
   "price": 26.5,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-bacon-acebolado",
   "catId": "c-sanduiches-bacon",
   "name": "Bacon Acebolado",
   "desc": "Pão, bacon, cebola, queijo, presunto, salada, milho e batata palha",
   "price": 22.8,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Cebola",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-eggs-bacon",
   "catId": "c-sanduiches-bacon",
   "name": "Eggs Bacon",
   "desc": "Pão, bacon, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 24.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-frambacon",
   "catId": "c-sanduiches-bacon",
   "name": "FramBacon",
   "desc": "Pão, bacon, frango, queijo, presunto, salada, milho e batata palha",
   "price": 26.5,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-x-frango",
   "catId": "c-sanduiches-de-frango",
   "name": "X Frango",
   "desc": "Pão, frango, queijo, presunto, salada, milho e batata palha",
   "price": 18.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-eggs-frango",
   "catId": "c-sanduiches-de-frango",
   "name": "Eggs Frango",
   "desc": "Pão, ovo, frango, queijo, presunto, salada, milho e batata palha",
   "price": 21.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-frango-acebolado",
   "catId": "c-sanduiches-de-frango",
   "name": "Frango Acebolado",
   "desc": "Pão, frango, cebola, queijo, salada, milho e batata palha",
   "price": 19.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Cebola",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-frangao",
   "catId": "c-sanduiches-de-frango",
   "name": "Frangão",
   "desc": "Pão, frango, hambúrguer, queijo, presunto, salada, milho e batata palha",
   "price": 23.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Hambúrguer",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-alazanhado",
   "catId": "c-sanduiches-de-frango",
   "name": "Alazanhado",
   "desc": "Pão, frango, 2 hambúrgueres, cebola, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 29.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "2 hambúrgueres",
     "removable": true
    },
    {
     "name": "Cebola",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-frango-especial",
   "catId": "c-sanduiches-de-frango",
   "name": "Frango Especial",
   "desc": "Pão, frango, bacon, calabresa, queijo, presunto, salada, milho e batata palha",
   "price": 30.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-x-tudo",
   "catId": "c-sanduiches-especiais",
   "name": "X Tudo",
   "desc": "Pão, hambúrguer, ovo, frango, bacon, calabresa, queijo, presunto, salada, milho e batata palha",
   "price": 38.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Hambúrguer",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ],
   "tag": "Mais pedido"
  },
  {
   "id": "p-surf-dog",
   "catId": "c-sanduiches-especiais",
   "name": "Surf Dog",
   "desc": "Pão, hambúrguer, bacon, salsicha, queijo, presunto, salada, milho e batata palha",
   "price": 25.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Hambúrguer",
     "removable": true
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Salsicha",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-sertanejo",
   "catId": "c-sanduiches-especiais",
   "name": "Sertanejo",
   "desc": "Pão, charque, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 25.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Charque",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-super-spetitos",
   "catId": "c-sanduiches-especiais",
   "name": "Super Spetitos",
   "desc": "Pão, 2 hambúrgueres, coração, ovo, frango, bacon, calabresa, queijo, presunto, salada, milho e batata palha",
   "price": 48.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "2 hambúrgueres",
     "removable": true
    },
    {
     "name": "Coração",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ],
   "tag": "Da casa"
  },
  {
   "id": "p-super-dand",
   "catId": "c-sanduiches-especiais",
   "name": "Super Dand",
   "desc": "Pão, 2 hambúrgueres, coração, 2 ovos, frango, filé, bacon, calabresa, 2 queijos, 2 presuntos, salada, milho e batata palha",
   "price": 66.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "2 hambúrgueres",
     "removable": true
    },
    {
     "name": "Coração",
     "removable": true
    },
    {
     "name": "2 ovos",
     "removable": true
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Filé",
     "removable": true
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "2 queijos",
     "removable": true
    },
    {
     "name": "2 presuntos",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-x-coracao",
   "catId": "c-sanduiches-de-coracao",
   "name": "X Coração",
   "desc": "Pão, coração, queijo, presunto, salada, milho e batata palha",
   "price": 24.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Coração",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-coracao-acebolado",
   "catId": "c-sanduiches-de-coracao",
   "name": "Coração Acebolado",
   "desc": "Pão, coração, cebola, queijo, presunto, salada, milho e batata palha",
   "price": 25.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Coração",
     "removable": true
    },
    {
     "name": "Cebola",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-eggs-coracao",
   "catId": "c-sanduiches-de-coracao",
   "name": "Eggs Coração",
   "desc": "Pão, coração, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 27.5,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Coração",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-frango-coracao",
   "catId": "c-sanduiches-de-coracao",
   "name": "Frango Coração",
   "desc": "Pão, frango, coração, queijo, presunto, salada, milho e batata palha",
   "price": 29.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Coração",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-coracao-especial",
   "catId": "c-sanduiches-de-coracao",
   "name": "Coração Especial",
   "desc": "Pão, coração, bacon, calabresa, queijo, presunto, salada, milho e batata palha",
   "price": 30.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Coração",
     "removable": true
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-x-file",
   "catId": "c-sanduiches-de-file",
   "name": "X Filé",
   "desc": "Pão, filé, queijo, salada, milho e batata palha",
   "price": 24.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Filé",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-file-acebolado",
   "catId": "c-sanduiches-de-file",
   "name": "Filé Acebolado",
   "desc": "Pão, filé, cebola, queijo, presunto, salada, milho e batata palha",
   "price": 25.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Filé",
     "removable": true
    },
    {
     "name": "Cebola",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-eggs-file",
   "catId": "c-sanduiches-de-file",
   "name": "Eggs Filé",
   "desc": "Pão, filé, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 28.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Filé",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-frango-file",
   "catId": "c-sanduiches-de-file",
   "name": "Frango Filé",
   "desc": "Pão, filé, frango, queijo, presunto, salada, milho e batata palha",
   "price": 29.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Filé",
     "removable": true
    },
    {
     "name": "Frango",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-file-especial",
   "catId": "c-sanduiches-de-file",
   "name": "Filé Especial",
   "desc": "Pão, filé, bacon, calabresa, queijo, presunto, salada, milho e batata palha",
   "price": 36.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Filé",
     "removable": true
    },
    {
     "name": "Bacon",
     "removable": true
    },
    {
     "name": "Calabresa",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-file-de-coracao",
   "catId": "c-sanduiches-de-file",
   "name": "Filé de Coração",
   "desc": "Pão, filé, coração, queijo, presunto, salada, milho e batata palha",
   "price": 34.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Filé",
     "removable": true
    },
    {
     "name": "Coração",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-x-toscana",
   "catId": "c-sanduiches-de-toscana",
   "name": "X Toscana",
   "desc": "Pão, toscana, queijo, presunto, salada, milho e batata palha",
   "price": 18.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Toscana",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-toscana-acebolado",
   "catId": "c-sanduiches-de-toscana",
   "name": "Toscana Acebolado",
   "desc": "Pão, toscana, cebola, queijo, presunto, salada, milho e batata palha",
   "price": 19.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Toscana",
     "removable": true
    },
    {
     "name": "Cebola",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-eggs-toscana",
   "catId": "c-sanduiches-de-toscana",
   "name": "Eggs Toscana",
   "desc": "Pão, toscana, ovo, queijo, presunto, salada, milho e batata palha",
   "price": 21.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Toscana",
     "removable": true
    },
    {
     "name": "Ovo",
     "removable": true
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Presunto",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    },
    {
     "name": "Batata palha",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-mini-pet-pepsi-200ml",
   "catId": "c-bebidas",
   "name": "Mini pet Pepsi 200ml",
   "desc": "Mini Pepsi 200ml, perfeita para acompanhar seu lanche",
   "price": 3.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1755046817689be3a13b02e_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-guaramix",
   "catId": "c-bebidas",
   "name": "Guaramix",
   "desc": "Refrescante e saborosa",
   "price": 2.5,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1755046939689be41b1701b_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-cerveja-heineken",
   "catId": "c-bebidas",
   "name": "Cerveja Heineken",
   "desc": "Lata 350ml",
   "price": 10.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1764634129692e2e114cc54_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-mini-pet-guarana-antarctica-200ml",
   "catId": "c-bebidas",
   "name": "Mini pet Guaraná Antarctica 200ml",
   "desc": "Perfeito para acompanhar seu lanche",
   "price": 3.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1755048834689beb8204763_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-agua-sem-gas-500ml",
   "catId": "c-bebidas",
   "name": "Água sem gás 500ml",
   "desc": "Água pura e refrescante",
   "price": 3.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1755049470689bedfe4f76e_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-agua-com-gas-500ml",
   "catId": "c-bebidas",
   "name": "Água com gás 500ml",
   "desc": "Água com gás em garrafa de 500ml",
   "price": 4.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1755110919689cde0769617_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-coca-cola-lata-350ml",
   "catId": "c-bebidas",
   "name": "Coca-Cola Lata 350ml",
   "desc": "Coca-Cola gelada em lata de 350ml",
   "price": 6.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/17480249396830be6baaaaa_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-guarana-lata-350ml",
   "catId": "c-bebidas",
   "name": "Guaraná Lata 350ml",
   "desc": "Guaraná gelado em lata de 350ml",
   "price": 6.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/17480249666830be8670f14_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-guarana-antarctica-1-litro",
   "catId": "c-bebidas",
   "name": "Guaraná Antarctica 1 litro",
   "desc": "Garrafa de 1 litro, para dividir",
   "price": 10.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1755110948689cde2424fed_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-coca-cola-1-litro",
   "catId": "c-bebidas",
   "name": "Coca-Cola 1 litro",
   "desc": "Garrafa de 1 litro, para dividir",
   "price": 10.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1764634301692e2ebd8b5c3_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-sucos-300ml",
   "catId": "c-bebidas",
   "name": "Sucos 300ml",
   "desc": "Escolha o sabor e escreva na observação",
   "price": 6.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1764634419692e2f330e7a7_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-bomba-de-morango-no-lance",
   "catId": "c-bebidas",
   "name": "Bomba de Morango no Lance",
   "desc": "Deliciosa bomba, perfeita para adoçar seu dia",
   "price": 8.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1764634605692e2fed55b09_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-bomba-de-guaracai",
   "catId": "c-bebidas",
   "name": "Bomba de Guaraçaí",
   "desc": "Uma explosão de sabores",
   "price": 8.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1764634689692e30416de5c_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-agua-de-coco",
   "catId": "c-bebidas",
   "name": "Água de coco",
   "desc": "Natural e gelada",
   "price": 6.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1764634790692e30a6b7fc1_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-fanta-lata-350ml",
   "catId": "c-bebidas",
   "name": "Fanta Lata 350ml",
   "desc": "Fanta gelada em lata 350ml",
   "price": 6.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1755110985689cde496c5a8_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-sprite-lata-350ml",
   "catId": "c-bebidas",
   "name": "Sprite Lata 350ml",
   "desc": "Limão e gás na medida certa",
   "price": 6.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1755111011689cde6366253_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-batata-supreme",
   "catId": "c-acompanhamentos",
   "name": "Batata Supreme",
   "desc": "Batata frita com bacon e cheddar cremoso",
   "price": 32.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-batata-frita-tradicional",
   "catId": "c-acompanhamentos",
   "name": "Batata Frita Tradicional",
   "desc": "Crocantes por fora e macias por dentro, temperadas com sal",
   "price": 18.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-onion-rings",
   "catId": "c-acompanhamentos",
   "name": "Onion Rings",
   "desc": "10 unidades de anéis de cebola com molho de cheddar",
   "price": 15.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1684092009646134696fa31_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-batata-carinha",
   "catId": "c-acompanhamentos",
   "name": "Batata Carinha",
   "desc": "10 unidades de batata carinha",
   "price": 15.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/1697068098652734420c779_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-pizza-brotao",
   "catId": "c-acompanhamentos",
   "name": "Pizza Brotão",
   "desc": "Maior do que a brotinho. Sabores: frango com catupiry ou calabresa",
   "price": 16.0,
   "img": "",
   "ingredients": [],
   "optionGroups": [
    {
     "id": "g-sabor",
     "name": "Sabor",
     "min": 1,
     "max": 1,
     "options": [
      {
       "id": "o-fc",
       "name": "Frango com catupiry",
       "price": 0
      },
      {
       "id": "o-cal",
       "name": "Calabresa",
       "price": 0
      }
     ]
    }
   ]
  },
  {
   "id": "p-mousse-tentacao",
   "catId": "c-acompanhamentos",
   "name": "Mousse Tentação",
   "desc": "Mousse de chocolate cremoso",
   "price": 6.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-levissimo",
   "catId": "c-opcao-vegetariana",
   "name": "Levíssimo",
   "desc": "Pão, queijo, salada e milho",
   "price": 12.0,
   "img": "",
   "ingredients": [
    {
     "name": "Pão",
     "removable": false
    },
    {
     "name": "Queijo",
     "removable": true
    },
    {
     "name": "Salada",
     "removable": true
    },
    {
     "name": "Milho",
     "removable": true
    }
   ],
   "optionGroups": [
    "adicionais"
   ]
  },
  {
   "id": "p-cream-cheese",
   "catId": "c-cremes",
   "name": "Cream Cheese",
   "desc": "",
   "price": 4.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-creme-de-catupiry",
   "catId": "c-cremes",
   "name": "Creme de Catupiry",
   "desc": "",
   "price": 4.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-creme-de-cheddar",
   "catId": "c-cremes",
   "name": "Creme de Cheddar",
   "desc": "",
   "price": 4.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-sorvete",
   "catId": "c-acai",
   "name": "Sorvete",
   "desc": "Preço por kg. Escolha o sabor que pesamos para você (a partir de 100g)",
   "price": 59.0,
   "img": "https://instadelivery-public.nyc3.cdn.digitaloceanspaces.com/itens/169005661964bc37ab58e0a_75_75.jpeg",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-acai-tradicional-1-kg",
   "catId": "c-acai",
   "name": "Açaí Tradicional 1 kg",
   "desc": "Pote com 1kg do nosso açaí cremoso, puro, sem complementos",
   "price": 35.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-copo-acai-300ml",
   "catId": "c-acai",
   "name": "Copo Açaí 300ml",
   "desc": "Escolha até 3 acompanhamentos",
   "price": 15.0,
   "img": "",
   "ingredients": [],
   "optionGroups": [
    {
     "id": "g-acomp",
     "name": "Acompanhamentos (até 3)",
     "min": 0,
     "max": 3,
     "options": [
      {
       "id": "o-chocoboll",
       "name": "Chocoboll",
       "price": 0
      },
      {
       "id": "o-ovomaltine-rocks",
       "name": "Ovomaltine Rocks",
       "price": 0
      },
      {
       "id": "o-granola",
       "name": "Granola",
       "price": 0
      },
      {
       "id": "o-cereja",
       "name": "Cereja",
       "price": 0
      },
      {
       "id": "o-castanha",
       "name": "Castanha",
       "price": 0
      },
      {
       "id": "o-amendoim",
       "name": "Amendoim",
       "price": 0
      },
      {
       "id": "o-confetes",
       "name": "Confetes",
       "price": 0
      },
      {
       "id": "o-leite-em-po",
       "name": "Leite em Pó",
       "price": 0
      },
      {
       "id": "o-nutella",
       "name": "Nutella",
       "price": 0
      },
      {
       "id": "o-morango",
       "name": "Morango",
       "price": 0
      },
      {
       "id": "o-banana",
       "name": "Banana",
       "price": 0
      },
      {
       "id": "o-kiwi",
       "name": "Kiwi",
       "price": 0
      }
     ]
    },
    {
     "id": "g-calda",
     "name": "Calda",
     "min": 0,
     "max": 1,
     "options": [
      {
       "id": "o-calda-de-morango",
       "name": "Calda de Morango",
       "price": 0
      },
      {
       "id": "o-calda-de-chocolate",
       "name": "Calda de Chocolate",
       "price": 0
      },
      {
       "id": "o-calda-de-leite-condensado",
       "name": "Calda de Leite Condensado",
       "price": 0
      }
     ]
    }
   ]
  },
  {
   "id": "p-copo-acai-400ml",
   "catId": "c-acai",
   "name": "Copo Açaí 400ml",
   "desc": "Escolha até 3 acompanhamentos",
   "price": 18.0,
   "img": "",
   "ingredients": [],
   "optionGroups": [
    {
     "id": "g-acomp",
     "name": "Acompanhamentos (até 3)",
     "min": 0,
     "max": 3,
     "options": [
      {
       "id": "o-chocoboll",
       "name": "Chocoboll",
       "price": 0
      },
      {
       "id": "o-ovomaltine-rocks",
       "name": "Ovomaltine Rocks",
       "price": 0
      },
      {
       "id": "o-granola",
       "name": "Granola",
       "price": 0
      },
      {
       "id": "o-cereja",
       "name": "Cereja",
       "price": 0
      },
      {
       "id": "o-castanha",
       "name": "Castanha",
       "price": 0
      },
      {
       "id": "o-amendoim",
       "name": "Amendoim",
       "price": 0
      },
      {
       "id": "o-confetes",
       "name": "Confetes",
       "price": 0
      },
      {
       "id": "o-leite-em-po",
       "name": "Leite em Pó",
       "price": 0
      },
      {
       "id": "o-nutella",
       "name": "Nutella",
       "price": 0
      },
      {
       "id": "o-morango",
       "name": "Morango",
       "price": 0
      },
      {
       "id": "o-banana",
       "name": "Banana",
       "price": 0
      },
      {
       "id": "o-kiwi",
       "name": "Kiwi",
       "price": 0
      }
     ]
    },
    {
     "id": "g-calda",
     "name": "Calda",
     "min": 0,
     "max": 1,
     "options": [
      {
       "id": "o-calda-de-morango",
       "name": "Calda de Morango",
       "price": 0
      },
      {
       "id": "o-calda-de-chocolate",
       "name": "Calda de Chocolate",
       "price": 0
      },
      {
       "id": "o-calda-de-leite-condensado",
       "name": "Calda de Leite Condensado",
       "price": 0
      }
     ]
    }
   ]
  },
  {
   "id": "p-copo-acai-500ml",
   "catId": "c-acai",
   "name": "Copo Açaí 500ml",
   "desc": "Escolha até 3 acompanhamentos",
   "price": 20.0,
   "img": "",
   "ingredients": [],
   "optionGroups": [
    {
     "id": "g-acomp",
     "name": "Acompanhamentos (até 3)",
     "min": 0,
     "max": 3,
     "options": [
      {
       "id": "o-chocoboll",
       "name": "Chocoboll",
       "price": 0
      },
      {
       "id": "o-ovomaltine-rocks",
       "name": "Ovomaltine Rocks",
       "price": 0
      },
      {
       "id": "o-granola",
       "name": "Granola",
       "price": 0
      },
      {
       "id": "o-cereja",
       "name": "Cereja",
       "price": 0
      },
      {
       "id": "o-castanha",
       "name": "Castanha",
       "price": 0
      },
      {
       "id": "o-amendoim",
       "name": "Amendoim",
       "price": 0
      },
      {
       "id": "o-confetes",
       "name": "Confetes",
       "price": 0
      },
      {
       "id": "o-leite-em-po",
       "name": "Leite em Pó",
       "price": 0
      },
      {
       "id": "o-nutella",
       "name": "Nutella",
       "price": 0
      },
      {
       "id": "o-morango",
       "name": "Morango",
       "price": 0
      },
      {
       "id": "o-banana",
       "name": "Banana",
       "price": 0
      },
      {
       "id": "o-kiwi",
       "name": "Kiwi",
       "price": 0
      }
     ]
    },
    {
     "id": "g-calda",
     "name": "Calda",
     "min": 0,
     "max": 1,
     "options": [
      {
       "id": "o-calda-de-morango",
       "name": "Calda de Morango",
       "price": 0
      },
      {
       "id": "o-calda-de-chocolate",
       "name": "Calda de Chocolate",
       "price": 0
      },
      {
       "id": "o-calda-de-leite-condensado",
       "name": "Calda de Leite Condensado",
       "price": 0
      }
     ]
    }
   ]
  },
  {
   "id": "p-copo-acai-700ml",
   "catId": "c-acai",
   "name": "Copo Açaí 700ml",
   "desc": "Escolha até 5 acompanhamentos",
   "price": 32.0,
   "img": "",
   "ingredients": [],
   "optionGroups": [
    {
     "id": "g-acomp",
     "name": "Acompanhamentos (até 5)",
     "min": 0,
     "max": 5,
     "options": [
      {
       "id": "o-chocoboll",
       "name": "Chocoboll",
       "price": 0
      },
      {
       "id": "o-ovomaltine-rocks",
       "name": "Ovomaltine Rocks",
       "price": 0
      },
      {
       "id": "o-granola",
       "name": "Granola",
       "price": 0
      },
      {
       "id": "o-cereja",
       "name": "Cereja",
       "price": 0
      },
      {
       "id": "o-castanha",
       "name": "Castanha",
       "price": 0
      },
      {
       "id": "o-amendoim",
       "name": "Amendoim",
       "price": 0
      },
      {
       "id": "o-confetes",
       "name": "Confetes",
       "price": 0
      },
      {
       "id": "o-leite-em-po",
       "name": "Leite em Pó",
       "price": 0
      },
      {
       "id": "o-nutella",
       "name": "Nutella",
       "price": 0
      },
      {
       "id": "o-morango",
       "name": "Morango",
       "price": 0
      },
      {
       "id": "o-banana",
       "name": "Banana",
       "price": 0
      },
      {
       "id": "o-kiwi",
       "name": "Kiwi",
       "price": 0
      }
     ]
    },
    {
     "id": "g-calda",
     "name": "Calda",
     "min": 0,
     "max": 1,
     "options": [
      {
       "id": "o-calda-de-morango",
       "name": "Calda de Morango",
       "price": 0
      },
      {
       "id": "o-calda-de-chocolate",
       "name": "Calda de Chocolate",
       "price": 0
      },
      {
       "id": "o-calda-de-leite-condensado",
       "name": "Calda de Leite Condensado",
       "price": 0
      }
     ]
    }
   ]
  },
  {
   "id": "p-hamburguer",
   "catId": "c-porcoes",
   "name": "Hambúrguer",
   "desc": "",
   "price": 5.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-ovo",
   "catId": "c-porcoes",
   "name": "Ovo",
   "desc": "",
   "price": 4.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-salsicha",
   "catId": "c-porcoes",
   "name": "Salsicha",
   "desc": "",
   "price": 3.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-presunto",
   "catId": "c-porcoes",
   "name": "Presunto",
   "desc": "",
   "price": 2.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-mussarela",
   "catId": "c-porcoes",
   "name": "Mussarela",
   "desc": "",
   "price": 2.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-salada",
   "catId": "c-porcoes",
   "name": "Salada",
   "desc": "",
   "price": 1.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-cebola",
   "catId": "c-porcoes",
   "name": "Cebola",
   "desc": "",
   "price": 2.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-repolho",
   "catId": "c-porcoes",
   "name": "Repolho",
   "desc": "",
   "price": 2.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-coracao",
   "catId": "c-porcoes",
   "name": "Coração",
   "desc": "",
   "price": 17.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-file",
   "catId": "c-porcoes",
   "name": "Filé",
   "desc": "",
   "price": 17.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-calabresa",
   "catId": "c-porcoes",
   "name": "Calabresa",
   "desc": "",
   "price": 12.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-toscana",
   "catId": "c-porcoes",
   "name": "Toscana",
   "desc": "",
   "price": 12.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-frango",
   "catId": "c-porcoes",
   "name": "Frango",
   "desc": "",
   "price": 12.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-bacon",
   "catId": "c-porcoes",
   "name": "Bacon",
   "desc": "",
   "price": 14.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-charque",
   "catId": "c-porcoes",
   "name": "Charque",
   "desc": "",
   "price": 15.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-milho",
   "catId": "c-porcoes",
   "name": "Milho",
   "desc": "",
   "price": 1.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  },
  {
   "id": "p-batata-palha",
   "catId": "c-porcoes",
   "name": "Batata Palha",
   "desc": "",
   "price": 1.0,
   "img": "",
   "ingredients": [],
   "optionGroups": []
  }
 ]
};
