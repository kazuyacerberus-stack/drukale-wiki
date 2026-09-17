-- DRUKALE / GLOSSÁRIO — TECNOLOGIAS DRUKHARI. Execute o arquivo INTEIRO no
-- SQL Editor do Supabase. Cadastra 204 termos de tecnologia no
-- glossário, pesquisados e traduzidos a partir de fontes públicas sobre o
-- Drukhari do Warhammer 40K (ver TECNOLOGIAS_DRUKHARI/FONTES.md na raiz do
-- projeto), usados aqui só como referência técnica — sem imagens oficiais.
-- Não apaga nem duplica nada existente; usa "on conflict (slug) do nothing"
-- para poder rodar de novo sem duplicar caso já tenha cadastrado antes.
begin;

insert into public.glossario (slug, termo, categoria, resumo, definicao)
values
  ('abraco-do-traidor', 'Abraço do traidor', 'Tecnologia', 'Criação e especificações conhecidas: Consiste em duas hastes metálicas implantadas sob a pele. Uso: Desencadear crescimento ósseo explosivo quando o portador morre.', 'Relíquia associada ao Cult of the Cursed Blade. O corpo torna-se uma armadilha póstuma, formando uma estrutura óssea cortante. O princípio de ativação pela morte é conhecido; a fonte não explica os materiais das hastes ou seu mecanismo de detecção. É um implante de retaliação, não um escudo que impede a morte.

Construção e funcionamento: Consiste em duas hastes metálicas implantadas sob a pele.

Aplicação: Desencadear crescimento ósseo explosivo quando o portador morre.'),
  ('adrenalight', 'Adrenalight', 'Tecnologia', 'Criação e especificações conhecidas: Composição não revelada. Uso: Intensificar ataques.', 'Estimulante dos cultos Wych. Duração e síntese não são detalhadas.

Construção e funcionamento: Composição não revelada.

Aplicação: Intensificar ataques.'),
  ('agonizador', 'Agonizador', 'Tecnologia', 'Criação e especificações conhecidas: Assume formas como chicote ou manopla e interfere no sistema nervoso do alvo. Uso: Incapacitar ou matar pela imposição de dor extrema.', 'O agonizador faz do controle neural sua principal função ofensiva. Diferentes formas físicas pertencem à mesma família tecnológica. A fonte admite efeitos sobre tripulações e sistemas de veículos, sem detalhar uma explicação única para todos os modelos. O porte da vítima pode ampliar o sofrimento, mas não fornece uma escala universal de dano.

Construção e funcionamento: Assume formas como chicote ou manopla e interfere no sistema nervoso do alvo.

Aplicação: Incapacitar ou matar pela imposição de dor extrema.'),
  ('aletas-de-foice', 'Aletas de foice', 'Tecnologia', 'Criação e especificações conhecidas: São grandes lâminas de casco do Tantalus carregadas por campos de dissonância molecular. Uso: Cortar veículos e infantaria durante passagens em velocidade.', 'O movimento do Tantalus acumula energia no sistema de lâminas. A interação entre impacto, gume e campo amplia a ação ofensiva do próprio casco. A fonte não detalha as ligas ou o gerador. Não se deve presumir que toda lâmina decorativa de um veículo Drukhari possua o mesmo campo.

Construção e funcionamento: São grandes lâminas de casco do Tantalus carregadas por campos de dissonância molecular.

Aplicação: Cortar veículos e infantaria durante passagens em velocidade.'),
  ('amplificador-de-tortura', 'Amplificador de tortura', 'Tecnologia', 'Criação e especificações conhecidas: Combina caixas de voz e projetores que processam os gritos de cativos. Uso: Criar uma onda sonora aterrorizante ao redor de um Raider.', 'Equipamento associado a transportes usados por Haemonculi em material da terceira edição. Sua função é perturbar e dispersar forças inimigas com energia sônica. Não é apenas um alto-falante decorativo, mas também não deve receber frequências ou potências inventadas. Deve permanecer distinto de um aríete Shock Prow.

Construção e funcionamento: Combina caixas de voz e projetores que processam os gritos de cativos.

Aplicação: Criar uma onda sonora aterrorizante ao redor de um Raider.'),
  ('ampola-do-envenenador', 'Ampola do envenenador', 'Tecnologia', 'Criação e especificações conhecidas: Reúne resíduos de experimentos malsucedidos, submetidos à alquimia grotesca dos Haemonculi. Uso: Liberar efeitos tóxicos variáveis quando o frasco se quebra.', 'O conteúdo pode manifestar ácidos corrosivos, vapores debilitantes ou outros efeitos ficcionais. Sua imprevisibilidade é parte da identidade da relíquia. O nome não corresponde a uma substância uniforme produzida por receita comum. A fonte não permite deduzir dosagens, composição ou um resultado garantido de cada utilização.

Construção e funcionamento: Reúne resíduos de experimentos malsucedidos, submetidos à alquimia grotesca dos Haemonculi.

Aplicação: Liberar efeitos tóxicos variáveis quando o frasco se quebra.'),
  ('amputador', 'Amputador', 'Tecnologia', 'Criação e especificações conhecidas: É formado por garras serrilhadas capazes de atravessar músculos e ossos. Uso: Amputar e mutilar em combate.', 'Equipamento dos Haemonculi apresentado em Shadow War: Armageddon. A fonte sustenta sua forma e finalidade, sem divulgar sistema motor, material das garras ou processo de fabricação.

Construção e funcionamento: É formado por garras serrilhadas capazes de atravessar músculos e ossos.

Aplicação: Amputar e mutilar em combate.'),
  ('amuleto-dos-tormentos', 'Amuleto dos tormentos', 'Tecnologia', 'Criação e especificações conhecidas: Abriga um organismo em uma pedra negra oca usada como joia. Uso: Detectar intenções hostis e retaliar com ataques psíquicos.', 'O Periapt utiliza um ser confinado como componente funcional de proteção. A detecção se refere à malícia dirigida ao portador, conforme a descrição narrativa. A espécie do organismo, sua obtenção e o método de confinamento não foram revelados. O efeito não deve ser convertido em leitura ilimitada de pensamentos.

Construção e funcionamento: Abriga um organismo em uma pedra negra oca usada como joia.

Aplicação: Detectar intenções hostis e retaliar com ataques psíquicos.'),
  ('animus-vitae', 'Animus Vitae', 'Tecnologia', 'Criação e especificações conhecidas: Tem a forma de uma esfera de arame farpado que se expande quando ativada. Uso: Capturar vítimas e drenar sua força vital.', 'O dispositivo transforma aprisionamento e sofrimento em vigor para os Drukhari. A aparência mecânica e o efeito de drenagem são conhecidos, mas a integração entre ambos não é explicada. Sua presença em diferentes edições não estabelece parâmetros fixos de alcance ou duração. O termo latino é preservado para identificação.

Construção e funcionamento: Tem a forma de uma esfera de arame farpado que se expande quando ativada.

Aplicação: Capturar vítimas e drenar sua força vital.'),
  ('apito-omnidimensional', 'Apito omnidimensional', 'Tecnologia', 'Criação e especificações conhecidas: Tem forma semelhante a uma concha espiral, feita de material vítreo de cores fora do espectro humano. Uso: Emitir um chamado que alcance espaço real e Warp e atraia bestas.', 'O usuário precisa gritar no dispositivo e sofre efeitos físicos adversos. O som descrito atravessa grandes distâncias e dimensões. A aparência e a função são conhecidas, mas não a fabricação. A referência vem do RPG Dark Heresy: Purge the Unclean e não implica equipamento padrão de todo Beastmaster.

Construção e funcionamento: Tem forma semelhante a uma concha espiral, feita de material vítreo de cores fora do espectro humano.

Aplicação: Emitir um chamado que alcance espaço real e Warp e atraia bestas.'),
  ('arcanjo-da-dor', 'Arcanjo da dor', 'Tecnologia', 'Criação e especificações conhecidas: Aprisiona uma essência demoníaca em um recipiente marcado com runas hostis à entidade. Uso: Liberar um grito incapacitante durante a fuga da entidade para o Warp.', 'Quando libertado, o ser aparece como uma figura alada e luminosa por um breve período. O equipamento combina contenção arcana e aplicação bélica. O fato de usar uma entidade do Warp não implica que os Drukhari a cultuem. As runas e o processo de aprisionamento não são especificados.

Construção e funcionamento: Aprisiona uma essência demoníaca em um recipiente marcado com runas hostis à entidade.

Aplicação: Liberar um grito incapacitante durante a fuga da entidade para o Warp.'),
  ('arma-liquefatora', 'Arma liquefatora', 'Tecnologia', 'Criação e especificações conhecidas: Reúne um sistema de projeção de ácido, por vezes incorporado ao corpo de criaturas modificadas. Uso: Dissolver tecidos e armaduras em ataques próximos.', 'A Liquifier Gun integra o arsenal dos Haemonculi e de suas criações. Alguns usuários projetam o próprio sangue corrosivo por meio de armas implantadas. Isso conecta engenharia de armamentos e alteração corporal. A fonte não especifica a composição do ácido nem estabelece que todo liquefator seja alimentado por sangue.

Construção e funcionamento: Reúne um sistema de projeção de ácido, por vezes incorporado ao corpo de criaturas modificadas.

Aplicação: Dissolver tecidos e armaduras em ataques próximos.'),
  ('armadilha-de-almas', 'Armadilha de almas', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza um receptáculo espiritual, frequentemente prismático ou em forma de crânio rúnico. Uso: Capturar a alma de um inimigo derrotado e fortalecer o proprietário.', 'O artefato converte energia roubada em poder para o usuário. Existem exemplares portáteis e relatos de integração a armaduras. A aparência não é padronizada. A fonte não identifica uma substância ou processo único de fabricação. O registro não equipara a armadilha às pedras espirituais protetoras dos Asuryani.

Construção e funcionamento: Utiliza um receptáculo espiritual, frequentemente prismático ou em forma de crânio rúnico.

Aplicação: Capturar a alma de um inimigo derrotado e fortalecer o proprietário.'),
  ('armadura-da-miseria', 'Armadura da miséria', 'Tecnologia', 'Criação e especificações conhecidas: Foi criada por Kalmael com fragmentos psicoempáticos de wraithbone envenenado. Uso: Combinar proteção física e ondas de pavor incapacitante.', 'A relíquia tem placas farpadas e impõe uma pressão emocional sobre inimigos próximos. Sua ameaça depende tanto da defesa quanto do terror. O artesão e parte dos materiais são conhecidos; o tratamento que torna o wraithbone envenenado não é explicado. Não é apresentada como equipamento comum produzido para todos os Kabalitas.

Construção e funcionamento: Foi criada por Kalmael com fragmentos psicoempáticos de wraithbone envenenado.

Aplicação: Combinar proteção física e ondas de pavor incapacitante.'),
  ('armadura-espectral', 'Armadura espectral', 'Tecnologia', 'Criação e especificações conhecidas: Combina resinas endurecidas, bolsas de gás mais leve que o ar e pequenos projetores de campo de força. Uso: Proteger sem comprometer intensamente a mobilidade.', 'Ghostplate é procurada por Archons e Scourges que precisam equilibrar proteção e leveza. A associação entre estrutura leve e defesa energética é explicitamente descrita. As fórmulas das resinas e as especificações dos projetores não são divulgadas. Não deve ser confundida com uma armadura inteiramente feita de wraithbone.

Construção e funcionamento: Combina resinas endurecidas, bolsas de gás mais leve que o ar e pequenos projetores de campo de força.

Aplicação: Proteger sem comprometer intensamente a mobilidade.'),
  ('armadura-kabalita', 'Armadura Kabalita', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza um traje leve e flexível, com resposta a impulsos neurais e pressurização descrita nas fontes. Uso: Proteger guerreiros mantendo agilidade e permitindo operações no vácuo.', 'A armadura pode endurecer sob comando do usuário. A proteção não elimina a dependência de reflexos, cobertura e mobilidade contra armamento militar poderoso. O termo designa uma família de equipamento, não um único exemplar de dimensões fixas. A estrutura detalhada dos materiais e a fabricação não são conhecidas.

Construção e funcionamento: Utiliza um traje leve e flexível, com resposta a impulsos neurais e pressurização descrita nas fontes.

Aplicação: Proteger guerreiros mantendo agilidade e permitindo operações no vácuo.'),
  ('armadura-laminada-dos-incubi', 'Armadura laminada dos Incubi', 'Tecnologia', 'Criação e especificações conhecidas: É uma armadura pesada equipada com lâminas. Uso: Aumentar proteção e capacidade ofensiva dos Incubi.', 'O equipamento aparece como opção em Dawn of War: Soulstorm. Sua raridade e peso são mencionados, porém não há liga ou fabricante identificado. O registro é específico dessa representação em jogo e não substitui a descrição geral do Incubus Warsuit. As lâminas não são automaticamente geradores de energia.

Construção e funcionamento: É uma armadura pesada equipada com lâminas.

Aplicação: Aumentar proteção e capacidade ofensiva dos Incubi.'),
  ('armadura-sorvedora', 'Armadura sorvedora', 'Tecnologia', 'Criação e especificações conhecidas: Combina circuitos parasitas com resinas cristalinas empatívoras. Uso: Curar o usuário aproveitando sangue e sofrimento próximos.', 'O equipamento absorve o sangue que o atinge e a dor de feridos ao redor, convertendo esses elementos em recuperação para quem o veste. A composição geral é identificada no codex da décima edição, mas a fabricação das resinas e dos circuitos não. O nome em português é uma tradução editorial.

Construção e funcionamento: Combina circuitos parasitas com resinas cristalinas empatívoras.

Aplicação: Curar o usuário aproveitando sangue e sofrimento próximos.'),
  ('armamento-de-estilhacos', 'Armamento de estilhaços', 'Tecnologia', 'Criação e especificações conhecidas: O mecanismo fragmenta cristais de neurotoxina solidificada e acelera os fragmentos por impulso eletromagnético. Uso: Ferir e envenenar alvos orgânicos.', 'Família de armas emblemática dos Drukhari, conhecida pelo nome inglês splinter. A munição combina perfuração e intoxicação, produzindo sofrimento intenso. O princípio aparece em armas pessoais e sistemas montados. A composição química dos cristais e os métodos industriais de cristalização não são revelados nas fontes consultadas.

Construção e funcionamento: O mecanismo fragmenta cristais de neurotoxina solidificada e acelera os fragmentos por impulso eletromagnético.

Aplicação: Ferir e envenenar alvos orgânicos.'),
  ('barca-de-assalto-slavebringer', 'Barca de assalto Slavebringer', 'Tecnologia', 'Criação e especificações conhecidas: Reúne capacidade de transporte de grupos de abordagem e de prisioneiros. Uso: Levar invasores até uma embarcação e retornar com cativos.', 'A nave auxiliar serve diretamente às expedições escravistas Drukhari. Sua dificuldade de interceptação por defesas pontuais aumenta a possibilidade de completar a aproximação. A fonte consultada não fornece planta, dimensões ou capacidade exata de passageiros.

Construção e funcionamento: Reúne capacidade de transporte de grupos de abordagem e de prisioneiros.

Aplicação: Levar invasores até uma embarcação e retornar com cativos.'),
  ('barca-de-cativos', 'Barca de cativos', 'Tecnologia', 'Criação e especificações conhecidas: Emprega uma embarcação de grande capacidade destinada ao transporte de prisioneiros. Uso: Movimentar populações capturadas nas incursões.', 'A descrição de Only War menciona transporte de centenas de milhares de escravizados. Isso informa a escala logística do tipo, sem estabelecer dimensões padronizadas ou a capacidade exata de todos os exemplares. Os sistemas internos de contenção não são detalhados.

Construção e funcionamento: Emprega uma embarcação de grande capacidade destinada ao transporte de prisioneiros.

Aplicação: Movimentar populações capturadas nas incursões.'),
  ('beijo-do-parasita', 'Beijo do parasita', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza uma pistola splinter com dardos cristalinos ligados a circuitos psicovampíricos. Uso: Drenar a essência de vítimas e revitalizar quem dispara.', 'A arma transfere a energia roubada ao seu usuário, unindo projéteis e tecnologia espiritual. A descrição a apresenta como uma das mais refinadas pistolas de estilhaços. Isso não autoriza atribuir o mesmo efeito a toda arma splinter. A fabricação dos circuitos e sua ligação com os dardos não são explicadas.

Construção e funcionamento: Utiliza uma pistola splinter com dardos cristalinos ligados a circuitos psicovampíricos.

Aplicação: Drenar a essência de vítimas e revitalizar quem dispara.'),
  ('blaster', 'Blaster', 'Tecnologia', 'Criação e especificações conhecidas: Miniaturiza o conceito da lança negra em uma arma mais leve. Uso: Fornecer poder antiblindagem à infantaria em movimento.', 'O blaster reduz o tamanho da plataforma de darklight para facilitar incursões e ataques móveis. Essa redução sacrifica alcance em relação à lança negra. É uma arma energética, distinta de rifles de estilhaços e de armas imperiais com nomes semelhantes. O mecanismo interno completo não foi publicado nas fontes consultadas.

Construção e funcionamento: Miniaturiza o conceito da lança negra em uma arma mais leve.

Aplicação: Fornecer poder antiblindagem à infantaria em movimento.'),
  ('blaster-disruptor', 'Blaster disruptor', 'Tecnologia', 'Criação e especificações conhecidas: Armazena energia eletromagnética recolhida nas regiões elevadas de Commorragh em uma arma leve de cano longo. Uso: Incapacitar sistemas de controle de veículos.', 'O Haywire Blaster é particularmente associado aos Scourges. Sua descarga compromete o funcionamento do alvo, permitindo ameaçar veículos fortemente blindados sem depender apenas de perfuração convencional. A fonte enfatiza que pode ser disparado durante o movimento. Não fornece os parâmetros de coleta, armazenamento ou intensidade da descarga.

Construção e funcionamento: Armazena energia eletromagnética recolhida nas regiões elevadas de Commorragh em uma arma leve de cano longo.

Aplicação: Incapacitar sistemas de controle de veículos.'),
  ('bomba-de-tormento', 'Bomba de tormento', 'Tecnologia', 'Criação e especificações conhecidas: Libera uma nuvem ocre de gás que concentra efeitos de dor e desespero. Uso: Espalhar terror extremo e incapacitar ou matar as vítimas.', 'Artefato descrito em Eye of Terror: Reign of Iron — Apocalypse, conforme a referência bibliográfica da fonte secundária. A composição é ficcional e não foi revelada. Não deve ser confundido automaticamente com a munição de um Torment Grenade Launcher.

Construção e funcionamento: Libera uma nuvem ocre de gás que concentra efeitos de dor e desespero.

Aplicação: Espalhar terror extremo e incapacitar ou matar as vítimas.'),
  ('bombardeiro-espacial-razorwing', 'Bombardeiro espacial Razorwing', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza uma plataforma de bombardeio espacial cuja fabricação não é revelada. Uso: Atacar embarcações inimigas em operações da frota.', 'O bombardeiro de Battlefleet Gothic é difícil de atingir com defesas pontuais. Deve permanecer separado do Razorwing Jetfighter, aeronave mais conhecida dos combates atmosféricos. A coincidência do nome não permite transferir automaticamente armamentos ou especificações entre ambos.

Construção e funcionamento: Utiliza uma plataforma de bombardeio espacial cuja fabricação não é revelada.

Aplicação: Atacar embarcações inimigas em operações da frota.'),
  ('bombardeiro-voidraven', 'Bombardeiro Voidraven', 'Tecnologia', 'Criação e especificações conhecidas: Integra armamento pesado, uma Void Mine e amortecimento sonoro em uma aeronave de dois tripulantes. Uso: Efetuar ataques aéreos de grande poder destrutivo.', 'O piloto conduz a aeronave enquanto o segundo tripulante opera suas armas. Sua discrição acústica auxilia a aproximação. As fontes descrevem componentes e emprego, sem um projeto completo de fabricação.

Construção e funcionamento: Integra armamento pesado, uma Void Mine e amortecimento sonoro em uma aeronave de dois tripulantes.

Aplicação: Efetuar ataques aéreos de grande poder destrutivo.'),
  ('boneca-do-pesadelo', 'Boneca do pesadelo', 'Tecnologia', 'Criação e especificações conhecidas: É confeccionada com carne roubada, vinculada ao proprietário e alimentada com seu sangue; versões antigas mencionam requisitos psíquicos. Uso: Absorver ferimentos destinados ao portador e, em relatos antigos, provocar visões.', 'A boneca é rara e perigosa. Descrições de edições diferentes enfatizam transferência de ferimentos ou estados de delírio e presságio. Esses efeitos são registrados como variações das fontes, sem afirmar que todo exemplar os manifesta simultaneamente. O vínculo exato e a fabricação permanecem secretos.

Construção e funcionamento: É confeccionada com carne roubada, vinculada ao proprietário e alimentada com seu sangue; versões antigas mencionam requisitos psíquicos.

Aplicação: Absorver ferimentos destinados ao portador e, em relatos antigos, provocar visões.'),
  ('caca-espacial-raptor', 'Caça espacial Raptor', 'Tecnologia', 'Criação e especificações conhecidas: Emprega uma plataforma de caça embarcado; componentes internos não são detalhados. Uso: Disputar superioridade espacial e proteger operações da frota.', 'O Raptor faz parte das aeronaves de ataque das frotas Drukhari e é comparado ao Darkstar em desempenho de combate e autonomia. A comparação narrativa não fornece números de velocidade ou duração de voo.

Construção e funcionamento: Emprega uma plataforma de caça embarcado; componentes internos não são detalhados.

Aplicação: Disputar superioridade espacial e proteger operações da frota.'),
  ('caca-raven', 'Caça Raven', 'Tecnologia', 'Criação e especificações conhecidas: Emprega uma célula leve monoposto com duas lanças negras e um canhão de estilhaços de cano longo. Uso: Realizar ataques a alvos terrestres.', 'Aeronave documentada em Imperial Armour e Aeronautica Imperialis. A configuração consultada não inclui mísseis. Sua inclusão preserva o histórico do arsenal; não afirma disponibilidade nas regras atuais.

Construção e funcionamento: Emprega uma célula leve monoposto com duas lanças negras e um canhão de estilhaços de cano longo.

Aplicação: Realizar ataques a alvos terrestres.'),
  ('caca-razorwing', 'Caça Razorwing', 'Tecnologia', 'Criação e especificações conhecidas: Reúne uma estrutura supersônica com armas splinter, lanças negras e suportes para mísseis em configurações publicadas. Uso: Apoiar incursões, atacar alvos terrestres e combater aeronaves.', 'Seus pilotos costumam ser veteranos das corridas Reaver. O Razorwing permite transportar armamento pesado com grande velocidade. A ficha trata do caça atmosférico, distinto do bombardeiro espacial Razorwing de Battlefleet Gothic. As cargas disponíveis e as regras variam entre edições; não são fornecidos números universais de desempenho.

Construção e funcionamento: Reúne uma estrutura supersônica com armas splinter, lanças negras e suportes para mísseis em configurações publicadas.

Aplicação: Apoiar incursões, atacar alvos terrestres e combater aeronaves.'),
  ('cadinho-da-maldicao', 'Cadinho da maldição', 'Tecnologia', 'Criação e especificações conhecidas: Aprisiona almas de psíquicos capturados e torturados. Uso: Liberar uma cacofonia espiritual particularmente perigosa para psíquicos próximos.', 'A destruição ou perturbação do alvo decorre do contato com as essências libertadas. A fonte revela apenas parte da criação: a captura das almas. Material do cadinho, mecanismo de ativação e etapas de construção não são conhecidos. O equipamento não demonstra que seus usuários precisem exercer poderes psíquicos próprios.

Construção e funcionamento: Aprisiona almas de psíquicos capturados e torturados.

Aplicação: Liberar uma cacofonia espiritual particularmente perigosa para psíquicos próximos.'),
  ('caixao-esfolador', 'Caixão esfolador', 'Tecnologia', 'Criação e especificações conhecidas: Mantém espíritos vinculados dentro de um receptáculo portátil. Uso: Soltar entidades que atacam uma vítima e retornam ao mestre.', 'Associado aos Haemonculi, inclusive Urien Rakarth, o artefato utiliza servos espirituais para executar sua ação destrutiva. O vínculo e o recipiente são os componentes conhecidos. A fonte não divulga como os espíritos são capturados ou obedecem ao usuário. A definição se refere a uma relíquia ficcional, não a uma máquina de corte convencional.

Construção e funcionamento: Mantém espíritos vinculados dentro de um receptáculo portátil.

Aplicação: Soltar entidades que atacam uma vítima e retornam ao mestre.'),
  ('calice-do-despeito', 'Cálice do despeito', 'Tecnologia', 'Criação e especificações conhecidas: É um dispositivo reverenciado pelos cultos Wych, com fabricação desconhecida. Uso: Emitir uma influência de ódio e frenesi sobre os próximos.', 'O objeto estimula violência descontrolada, conforme sua descrição no codex da terceira edição. Seu formato ritual não permite deduzir que funcione por ingestão de líquido: a fonte enfatiza uma aura. Não se conhecem materiais, criador ou condições exatas de produção do efeito.

Construção e funcionamento: É um dispositivo reverenciado pelos cultos Wych, com fabricação desconhecida.

Aplicação: Emitir uma influência de ódio e frenesi sobre os próximos.'),
  ('campo-cintilante', 'Campo cintilante', 'Tecnologia', 'Criação e especificações conhecidas: Incorpora um escudo óptico de força avançado em veículos. Uso: Dificultar a aquisição de alvos pelo inimigo.', 'O Flickerfield faz o veículo parecer oscilar entre presença e ausência. A descrição enfatiza a confusão óptica, sem demonstrar que a máquina se teletransporte realmente a cada oscilação. Seu uso complementa a velocidade dos veículos Drukhari. A composição do gerador, o consumo e os métodos industriais permanecem desconhecidos.

Construção e funcionamento: Incorpora um escudo óptico de força avançado em veículos.

Aplicação: Dificultar a aquisição de alvos pelo inimigo.'),
  ('campo-de-duplicacao', 'Campo de duplicação', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza um dispositivo que projeta imagens semelhantes a hologramas, sincronizadas ao portador. Uso: Confundir inimigos sobre a posição verdadeira do usuário.', 'O nome Clone Field não indica clonagem biológica. As duplicatas reproduzem aparência e movimentos para dificultar ataques. É equipamento associado a Archons. A restrição de combinação com Shadow Field aparece em regras da quinta edição e não deve ser convertida em uma lei física universal. Componentes e fabricação não são conhecidos.

Construção e funcionamento: Utiliza um dispositivo que projeta imagens semelhantes a hologramas, sincronizadas ao portador.

Aplicação: Confundir inimigos sobre a posição verdadeira do usuário.'),
  ('campo-de-sombras-naval', 'Campo de sombras naval', 'Tecnologia', 'Criação e especificações conhecidas: Produz uma distorção que encobre a posição e os movimentos da embarcação. Uso: Dificultar a identificação e a mira inimigas.', 'Sistema de proteção e ocultação empregado por espaçonaves Drukhari. Pode atuar em conjunto com motores miméticos. Deve ser cadastrado separadamente do campo pessoal Shadow Field: os nomes próximos não demonstram que sejam o mesmo equipamento em escalas diferentes.

Construção e funcionamento: Produz uma distorção que encobre a posição e os movimentos da embarcação.

Aplicação: Dificultar a identificação e a mira inimigas.'),
  ('campo-de-sombras-pessoal', 'Campo de sombras pessoal', 'Tecnologia', 'Criação e especificações conhecidas: Sua história envolve cristais noturnos nisariel de Aelindrach e o desenvolvimento por Drael Malcorvin antes da Queda. Uso: Absorver ataques e ocultar um usuário em escuridão.', 'Equipamento raro de proteção pessoal que cria uma envoltória de energia sombria. Pode absorver grande parte de um ataque, mas é vulnerável a sobrecarga. A origem dos cristais não equivale a um projeto completo de fabricação. Este registro distingue o Shadow Field pessoal do Shadowfield naval, que oculta a posição de uma nave.

Construção e funcionamento: Sua história envolve cristais noturnos nisariel de Aelindrach e o desenvolvimento por Drael Malcorvin antes da Queda.

Aplicação: Absorver ataques e ocultar um usuário em escuridão.'),
  ('campo-mestre-de-duplicacao', 'Campo mestre de duplicação', 'Tecnologia', 'Criação e especificações conhecidas: É um exemplar excepcional da tecnologia Clone Field, considerado por relatos o primeiro de sua espécie. Uso: Produzir duplicatas visuais perfeitamente sincronizadas.', 'O campo amplia o prestígio e a qualidade de uma tecnologia de engano já conhecida. Sua antiguidade é apresentada como reputação, não como data comprovada de invenção. A fonte não descreve diferenças mensuráveis de potência nem componentes exclusivos. Não cria organismos autônomos ou cópias permanentes do portador.

Construção e funcionamento: É um exemplar excepcional da tecnologia Clone Field, considerado por relatos o primeiro de sua espécie.

Aplicação: Produzir duplicatas visuais perfeitamente sincronizadas.'),
  ('canhao-de-estilhacos', 'Canhão de estilhaços', 'Tecnologia', 'Criação e especificações conhecidas: Integra estabilizador semilíquido, gatilho de rajada automática, aletas de direção magnetoimpulsiva e um gerador adicional. Uso: Sustentar fogo splinter pesado mesmo em movimento.', 'O estabilizador compensa alterações do centro de gravidade; as aletas mantêm o campo de aceleração estável. O gatilho pode prolongar a rajada por alguns segundos. A sofisticação torna a arma mais cara que versões leves. A fonte apresenta componentes de construção, mas não materiais e métodos de fabricação completos.

Construção e funcionamento: Integra estabilizador semilíquido, gatilho de rajada automática, aletas de direção magnetoimpulsiva e um gerador adicional.

Aplicação: Sustentar fogo splinter pesado mesmo em movimento.'),
  ('canhao-desintegrador', 'Canhão desintegrador', 'Tecnologia', 'Criação e especificações conhecidas: Manipula partículas de matéria instável provenientes de um sol roubado. Uso: Proporcionar fogo energético pesado.', 'O desintegrador demonstra a capacidade drukhari de aproveitar matéria estelar. A descrição o compara às armas de plasma imperiais, destacando maior sofisticação e controle térmico. Essa comparação não o transforma em uma arma imperial nem em uma lança negra. O sistema de contenção detalhado, a potência e os materiais do canhão não foram revelados.

Construção e funcionamento: Manipula partículas de matéria instável provenientes de um sol roubado.

Aplicação: Proporcionar fogo energético pesado.'),
  ('capuz-do-delirio', 'Capuz do delírio', 'Tecnologia', 'Criação e especificações conhecidas: Incorpora um campo de duplicação que interfere na percepção visual de observadores. Uso: Confundir tentativas de assassinato contra senhores Drukhari.', 'As imagens do portador tornam-se difíceis de distinguir da figura real e podem persistir na percepção por horas. O equipamento é documentado no codex da décima edição. Não há informação suficiente para definir componentes ou afirmar que as imagens tenham substância física. É uma aplicação especializada de engano visual.

Construção e funcionamento: Incorpora um campo de duplicação que interfere na percepção visual de observadores.

Aplicação: Confundir tentativas de assassinato contra senhores Drukhari.'),
  ('carabina-de-estilhacos', 'Carabina de estilhaços', 'Tecnologia', 'Criação e especificações conhecidas: Adapta a plataforma splinter com cano ampliado para liberar salvas maiores de cristais tóxicos. Uso: Combater em movimento com Scourges e alguns Trueborn.', 'A carabina privilegia volume de fogo e mobilidade, com alcance inferior ao rifle de estilhaços na descrição consultada. Sua identidade depende do sistema de projéteis venenosos, não de disparos laser. Medidas físicas, cadência numérica e fabricação do conjunto não foram especificadas.

Construção e funcionamento: Adapta a plataforma splinter com cano ampliado para liberar salvas maiores de cristais tóxicos.

Aplicação: Combater em movimento com Scourges e alguns Trueborn.'),
  ('chicote-eletrocorrosivo', 'Chicote eletrocorrosivo', 'Tecnologia', 'Criação e especificações conhecidas: Combina um chicote embebido em veneno com uma aplicação tecnológica voltada à dor. Uso: Reduzir a disposição do adversário para continuar lutando.', 'Usado por Archons, Haemonculi e líderes Wych, aproxima-se funcionalmente do agonizador, embora a descrição consultada o apresente como menos letal. Sua especialização está no sofrimento incapacitante. A fonte não fornece uma composição corrosiva nem explica em detalhe a relação entre o componente elétrico e o veneno.

Construção e funcionamento: Combina um chicote embebido em veneno com uma aplicação tecnológica voltada à dor.

Aplicação: Reduzir a disposição do adversário para continuar lutando.'),
  ('chicote-triptico', 'Chicote tríptico', 'Tecnologia', 'Criação e especificações conhecidas: Funde três agonizadores em um conjunto cuidadosamente equilibrado, originado nos primeiros tempos das arenas de Commorragh. Uso: Oferecer uma arma excepcional às Succubi capazes de dominá-la.', 'Poucas combatentes carregaram a relíquia, tradicionalmente obtida ao derrotar sua possuidora na arena. Seu valor deriva da construção tripla e da exigência de habilidade. Não há data exata de forja, fabricante identificado ou projeto completo. A propriedade muda, portanto não é atribuída a uma portadora permanente.

Construção e funcionamento: Funde três agonizadores em um conjunto cuidadosamente equilibrado, originado nos primeiros tempos das arenas de Commorragh.

Aplicação: Oferecer uma arma excepcional às Succubi capazes de dominá-la.'),
  ('contratorpedeiro-immortality-denied', 'Contratorpedeiro Immortality Denied', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lançadores Scythe. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lançadores Scythe.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('contratorpedeiro-sigil', 'Contratorpedeiro Sigil', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne torpedos e lançadores Scythe. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne torpedos e lançadores Scythe.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('conversao-em-grotesque', 'Conversão em Grotesque', 'Tecnologia', 'Criação e especificações conhecidas: Transforma prisioneiros por alterações de crescimento, estímulos musculares, expansão óssea e integração de armas. Uso: Criar servos de choque de grande força.', 'Grotesques são construções vivas dos Haemonculi. Diferentemente dos Wracks, a transformação não é descrita como uma escolha voluntária. Controle mental reduzido, máscaras e sistemas de drogas completam muitos exemplares. A aparência mudou entre edições, portanto as versões da terceira edição não devem ser fundidas sem ressalva às posteriores. A fonte não oferece um protocolo reproduzível.

Construção e funcionamento: Transforma prisioneiros por alterações de crescimento, estímulos musculares, expansão óssea e integração de armas.

Aplicação: Criar servos de choque de grande força.'),
  ('coracao-de-fogo', 'Coração de fogo', 'Tecnologia', 'Criação e especificações conhecidas: É um artefato anterior à Queda, originalmente ligado à modelagem de mundos e sistemas. Uso: Afetar o núcleo de um planeta e desencadear destruição global.', 'O Fireheart utiliza um pulso psíquico e foi empregado contra Tirânidas em Dûriel. Os Drukhari não conseguiam ativá-lo sozinhos e precisaram de Farseers dos mundos-nave. Seu cadastro identifica posse e uso contextual, não fabricação drukhari contemporânea. Não existe projeto de construção conhecido nas fontes consultadas.

Construção e funcionamento: É um artefato anterior à Queda, originalmente ligado à modelagem de mundos e sistemas.

Aplicação: Afetar o núcleo de um planeta e desencadear destruição global.'),
  ('coroa-de-almas', 'Coroa de almas', 'Tecnologia', 'Criação e especificações conhecidas: Prende fragmentos das pedras espirituais de Farseers mortos em uma coroa com lâminas. Uso: Fornecer vislumbres de futuros possíveis ao Archon.', 'As almas aprisionadas sussurram informações fragmentárias e enlouquecedoras. Um usuário atento pode empregá-las para evitar certos destinos, sem adquirir conhecimento infalível do futuro. O artefato explora receptáculos espirituais aeldari capturados. Não se conhece o método completo de fixação e de vinculação dessas almas à coroa.

Construção e funcionamento: Prende fragmentos das pedras espirituais de Farseers mortos em uma coroa com lâminas.

Aplicação: Fornecer vislumbres de futuros possíveis ao Archon.'),
  ('cruzador-bleak-soul', 'Cruzador Bleak Soul', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lançadores Scythe e capacidade de lançar módulos Impaler. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lançadores Scythe e capacidade de lançar módulos Impaler.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('cruzador-bloodied-claw', 'Cruzador Bloodied Claw', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne torpedos e lançadores Scythe. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne torpedos e lançadores Scythe.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('cruzador-fiend-ascendant', 'Cruzador Fiend Ascendant', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lançadores Scythe e hangares de aeronaves. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lançadores Scythe e hangares de aeronaves.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('cruzador-flayed-skull', 'Cruzador Flayed Skull', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lanças Phantom e lançadores Scythe. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lanças Phantom e lançadores Scythe.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('cruzador-leve-baleful-gaze', 'Cruzador leve Baleful Gaze', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lançadores Scythe e módulos Impaler. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lançadores Scythe e módulos Impaler.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('cruzador-leve-bladed-lotus', 'Cruzador leve Bladed Lotus', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lançadores Scythe e módulos Impaler. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lançadores Scythe e módulos Impaler.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('cruzador-leve-burning-scale', 'Cruzador leve Burning Scale', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lançadores Scythe e aeronaves embarcadas. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lançadores Scythe e aeronaves embarcadas.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('cruzador-leve-dark-mirror', 'Cruzador leve Dark Mirror', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lanças Phantom e lançadores Scythe. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lanças Phantom e lançadores Scythe.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('cruzador-torture', 'Cruzador Torture', 'Tecnologia', 'Criação e especificações conhecidas: Combina casco de cruzador, propulsão avançada e armamento cuja configuração varia entre exemplares. Uso: Conduzir incursões, combates e captura de outras embarcações.', 'A classificação engloba construções heterogêneas. As configurações documentadas incluem lanças Phantom e tubos de torpedos, com alternativas de módulos de abordagem Impaler ou aeronaves embarcadas. Não existe um projeto industrial universal publicado para toda a classe.

Construção e funcionamento: Combina casco de cruzador, propulsão avançada e armamento cuja configuração varia entre exemplares.

Aplicação: Conduzir incursões, combates e captura de outras embarcações.'),
  ('demiklaives', 'Demiklaives', 'Tecnologia', 'Criação e especificações conhecidas: São duas lâminas de energia que podem ser usadas separadas ou reunidas como uma só arma. Uso: Alternar estilos ofensivos durante o combate.', 'As demiklaives são associadas a Klaivexes, a determinados santuários Incubi e a Drazhar. A mudança de configuração é suficientemente rápida para ocorrer em combate. A fonte não fornece o mecanismo de ligação ou uma liga exclusiva. O projeto prioriza versatilidade em relação à klaive de configuração única.

Construção e funcionamento: São duas lâminas de energia que podem ser usadas separadas ou reunidas como uma só arma.

Aplicação: Alternar estilos ofensivos durante o combate.'),
  ('desintegrador-de-pulso', 'Desintegrador de pulso', 'Tecnologia', 'Criação e especificações conhecidas: Emite pulsos rápidos de matéria subatômica instável, com controle térmico avançado. Uso: Oferecer fogo pesado a veículos como o Tantalus.', 'O sistema destrói alvos por meio de emissões energéticas sucessivas e é descrito como capaz de manter cadência elevada sem o superaquecimento típico de tecnologias inferiores. Não se conhecem os materiais de contenção ou os geradores específicos. É uma variante de armamento, não outro nome do veículo que a transporta.

Construção e funcionamento: Emite pulsos rápidos de matéria subatômica instável, com controle térmico avançado.

Aplicação: Oferecer fogo pesado a veículos como o Tantalus.'),
  ('dispositivo-de-shudderworm', 'Dispositivo de Shudderworm', 'Tecnologia', 'Criação e especificações conhecidas: Integra neuroparasitas oriundos da Teia em mecanismos dos Haemonculi, mantendo-os em recipientes Inkglass. Uso: Recolher agonia psíquica e liberar energia que revigora Drukhari.', 'A tecnologia está no acondicionamento e emprego artificial dos parasitas. Eles absorvem sofrimento durante o combate e posteriormente o regurgitam como energia aproveitável. Não são baterias elétricas comuns, nem todo membro da espécie deve ser classificado como artefato.

Construção e funcionamento: Integra neuroparasitas oriundos da Teia em mecanismos dos Haemonculi, mantendo-os em recipientes Inkglass.

Aplicação: Recolher agonia psíquica e liberar energia que revigora Drukhari.'),
  ('drogas-de-combate-drukhari', 'Drogas de combate Drukhari', 'Tecnologia', 'Criação e especificações conhecidas: Preparações de fórmula desconhecida. Uso: Melhorar o desempenho de Wyches.', 'Os efeitos variam entre substâncias e edições; não representam especificações científicas.

Construção e funcionamento: Preparações de fórmula desconhecida.

Aplicação: Melhorar o desempenho de Wyches.'),
  ('elmo-do-despeito', 'Elmo do despeito', 'Tecnologia', 'Criação e especificações conhecidas: Integra uma defesa que gera retroalimentação psiônica violenta. Uso: Proteger o portador de ataques psíquicos e ameaçar o agressor.', 'A relíquia oferece aos Drukhari uma resposta tecnológica às capacidades psíquicas que normalmente evitam exercer. A fonte descreve uma reação potencialmente letal contra o psíquico inimigo. Isso não transforma o usuário em um vidente. Fabricante, materiais e processo de construção do campo não são revelados.

Construção e funcionamento: Integra uma defesa que gera retroalimentação psiônica violenta.

Aplicação: Proteger o portador de ataques psíquicos e ameaçar o agressor.'),
  ('elmo-espelhado', 'Elmo espelhado', 'Tecnologia', 'Criação e especificações conhecidas: Contém amplificadores sensoriais que destacam movimentos sutis dos adversários. Uso: Ajudar gladiadores Wych a antecipar ataques.', 'A antecipação decorre da observação ampliada, sem necessidade de atribuir clarividência ao aparelho. A fonte vem de Shadow War: Armageddon. Material do visor, circuitos e método de produção não são especificados. O nome espelhado não demonstra que o elmo reflita disparos ou crie duplicatas.

Construção e funcionamento: Contém amplificadores sensoriais que destacam movimentos sutis dos adversários.

Aplicação: Ajudar gladiadores Wych a antecipar ataques.'),
  ('elmo-tormentor', 'Elmo Tormentor', 'Tecnologia', 'Criação e especificações conhecidas: Incorpora uma pistola de estilhaços miniaturizada a um capacete de Incubus. Uso: Oferecer disparos integrados ao equipamento de combate.', 'Equipamento identificado pela fonte de desambiguação consultada, com documentação resumida. Não é o mesmo objeto que o Tormentor peitoral feito de pedra espiritual. A forma exata de acionamento e a fabricação não são estabelecidas nesta ficha.

Construção e funcionamento: Incorpora uma pistola de estilhaços miniaturizada a um capacete de Incubus.

Aplicação: Oferecer disparos integrados ao equipamento de combate.'),
  ('elmos-de-tortura-dos-incubi', 'Elmos de tortura dos Incubi', 'Tecnologia', 'Criação e especificações conhecidas: Estabelecem ligações neurais entre o usuário e suas armas. Uso: Aprimorar o desempenho de combate dos Incubi.', 'Este equipamento é documentado como melhoria no jogo Dawn of War: Soulstorm. A fonte consultada alerta para diferenças entre esse material antigo e representações posteriores. O cadastro preserva sua origem em jogo eletrônico. Não há especificações suficientes para inferir a arquitetura dos circuitos ou equiparar automaticamente esses elmos ao Tormentor Helm.

Construção e funcionamento: Estabelecem ligações neurais entre o usuário e suas armas.

Aplicação: Aprimorar o desempenho de combate dos Incubi.'),
  ('empalador', 'Empalador', 'Tecnologia', 'Criação e especificações conhecidas: Apresenta uma grande lâmina monomolecular em uma arma de combate próximo. Uso: Atingir inimigos, frequentemente enquanto estão presos por uma Shardnet.', 'O Impaler aparece tanto nas Kabals quanto nos cultos Wych. Seu nome designa aqui a arma pessoal e não o módulo naval de abordagem homônimo. A fonte o aproxima do Punisher, mas não estabelece identidade entre os projetos. A técnica de produção do gume não é detalhada.

Construção e funcionamento: Apresenta uma grande lâmina monomolecular em uma arma de combate próximo.

Aplicação: Atingir inimigos, frequentemente enquanto estão presos por uma Shardnet.'),
  ('encouracado-falling-moon', 'Encouraçado Falling Moon', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lanças Phantom, lançadores Scythe e torpedos. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lanças Phantom, lançadores Scythe e torpedos.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('encouracado-obsidian-rose', 'Encouraçado Obsidian Rose', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lanças Phantom e lançadores Scythe. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lanças Phantom e lançadores Scythe.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('enxertos-de-voo-dos-scourges', 'Enxertos de voo dos Scourges', 'Tecnologia', 'Criação e especificações conhecidas: Combina ossos ocos, asas enxertadas, reforço muscular e dispensadores de adrenalina. Uso: Permitir voo corporal verdadeiro.', 'Drukhari ricos submetem-se a transformações realizadas pelos Haemonculi para tornarem-se Scourges. A prática tem antecedentes nos antigos cultos solares. O voo resulta de alterações integradas, não apenas da fixação de asas decorativas. A fonte não fornece medidas biomecânicas, materiais de enxerto ou parâmetros cirúrgicos. O termo do cadastro descreve a tecnologia, não a unidade militar inteira.

Construção e funcionamento: Combina ossos ocos, asas enxertadas, reforço muscular e dispensadores de adrenalina.

Aplicação: Permitir voo corporal verdadeiro.'),
  ('escolta-corsair', 'Escolta Corsair', 'Tecnologia', 'Criação e especificações conhecidas: Emprega casco de escolta com baterias de proa e configurações alternativas de armas ou abordagem. Uso: Escoltar incursões e atacar alvos com velocidade e surpresa.', 'Corsair é uma classificação relativamente abrangente para pequenas naves Drukhari. Pode reunir lanças Phantom, torpedos ou módulos Impaler, conforme o exemplar, e frequentemente utiliza motores miméticos. O nome não significa que pertença necessariamente aos Corsários Aeldari de outra organização.

Construção e funcionamento: Emprega casco de escolta com baterias de proa e configurações alternativas de armas ou abordagem.

Aplicação: Escoltar incursões e atacar alvos com velocidade e surpresa.'),
  ('escudo-noturno', 'Escudo noturno', 'Tecnologia', 'Criação e especificações conhecidas: É um módulo veicular que produz um campo de sombras ao redor do casco. Uso: Ocultar a posição de Raiders e Ravagers sob fogo.', 'O Night Shield perturba a percepção do inimigo, dificultando localizar precisamente o veículo. Não é apresentado como simples espessura adicional de blindagem. Seu desempenho em regras depende da edição. A descrição consultada, ligada à terceira edição, não explica a fabricação do módulo nem oferece uma teoria física completa.

Construção e funcionamento: É um módulo veicular que produz um campo de sombras ao redor do casco.

Aplicação: Ocultar a posição de Raiders e Ravagers sob fogo.'),
  ('escultura-da-carne', 'Escultura da carne', 'Tecnologia', 'Criação e especificações conhecidas: Altera órgãos, membros, esqueleto e fluidos corporais por intervenções dos Haemonculi. Uso: Transformar o corpo para funções, aparência e resistência desejadas.', 'Termo editorial para um conjunto de práticas, não um aparelho único. Inclui deslocamento de órgãos e adição de membros. As fontes mostram resultados, mas não um método uniforme de fabricação de corpos.

Construção e funcionamento: Altera órgãos, membros, esqueleto e fluidos corporais por intervenções dos Haemonculi.

Aplicação: Transformar o corpo para funções, aparência e resistência desejadas.'),
  ('farmacofex', 'Farmacófex', 'Tecnologia', 'Criação e especificações conhecidas: Consiste em um atomizador químico integrado ao equipamento ou corpo do portador. Uso: Envolver aliados em uma névoa hiperestimulante.', 'A relíquia do codex da décima edição aplica substâncias por dispersão ao redor do usuário. A fonte identifica atomização e efeito estimulante, mas não esclarece a montagem, a fórmula ou a duração. Seu papel é apoio químico aos combatentes. O termo original foi preservado como identificador.

Construção e funcionamento: Consiste em um atomizador químico integrado ao equipamento ou corpo do portador.

Aplicação: Envolver aliados em uma névoa hiperestimulante.'),
  ('ferrao-espiritual', 'Ferrão espiritual', 'Tecnologia', 'Criação e especificações conhecidas: Carrega as agulhas de uma Stinger Pistol com orvalho recolhido no fundo do Chasm of Echoes. Uso: Dar forma física aos medos da vítima.', 'Relíquia do coven Dark Creed, distingue-se da Stinger comum pela carga sobrenatural. A fonte descreve os temores irrompendo fisicamente a partir do cérebro da vítima. O local de obtenção do material é conhecido, mas sua natureza e o processo de preparação não. O efeito é ficcional e específico desse artefato.

Construção e funcionamento: Carrega as agulhas de uma Stinger Pistol com orvalho recolhido no fundo do Chasm of Echoes.

Aplicação: Dar forma física aos medos da vítima.'),
  ('flagelo-de-navalhas', 'Flagelo de navalhas', 'Tecnologia', 'Criação e especificações conhecidas: Reúne segmentos cortantes ligados por um fio, alternando rigidez e flexibilidade. Uso: Contornar defesas e desferir golpes de espada ou chicote.', 'O Razorflail muda rapidamente de comportamento durante um ataque, tornando sua trajetória difícil de aparar. As Wyches especializadas em seu uso são chamadas Lacerai. A fonte descreve a estrutura segmentada, sem explicar o mecanismo de transição ou a liga das lâminas. A arma é distinta de um chicote de energia.

Construção e funcionamento: Reúne segmentos cortantes ligados por um fio, alternando rigidez e flexibilidade.

Aplicação: Contornar defesas e desferir golpes de espada ou chicote.'),
  ('flagelo-dos-wracks', 'Flagelo dos Wracks', 'Tecnologia', 'Criação e especificações conhecidas: É um veneno das Lhamaeans com fabricação não documentada. Uso: Provocar morte rápida.', 'O nome inglês é mantido para identificação. A fonte não comprova que o veneno afete exclusivamente Wracks, nem fornece ingredientes ou mecanismos específicos. A tradução portuguesa é uma aproximação editorial. Sua presença como produto nomeado justifica uma ficha própria, mesmo com descrição publicada curta.

Construção e funcionamento: É um veneno das Lhamaeans com fabricação não documentada.

Aplicação: Provocar morte rápida.'),
  ('foice-negra', 'Foice negra', 'Tecnologia', 'Criação e especificações conhecidas: Emprega tecnologia darklight em um sistema de armamento de aeronave. Uso: Armar bombardeiros Voidraven.', 'Dark Scythe é uma opção ofensiva para o Voidraven, registrada no material da sétima edição. A fonte identifica sua família energética e a plataforma usuária, mas não detalha componentes, fabricante ou dinâmica exata do disparo. Deve ser diferenciada da Void Lance e da D-scythe utilizada por outras forças aeldari.

Construção e funcionamento: Emprega tecnologia darklight em um sistema de armamento de aeronave.

Aplicação: Armar bombardeiros Voidraven.'),
  ('foices-de-veiculo', 'Foices de veículo', 'Tecnologia', 'Criação e especificações conhecidas: Acopla lâminas muito afiadas à plataforma. Uso: Cortar inimigos durante a passagem.', 'As lâminas também dificultam aproximações corpo a corpo. Materiais e dimensões variam ou não foram informados.

Construção e funcionamento: Acopla lâminas muito afiadas à plataforma.

Aplicação: Cortar inimigos durante a passagem.'),
  ('fragata-talon-cyriix', 'Fragata Talon Cyriix', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne torpedos e lançadores Scythe. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne torpedos e lançadores Scythe.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('fragata-venom-blade', 'Fragata Venom Blade', 'Tecnologia', 'Criação e especificações conhecidas: A configuração apresentada no jogo reúne lanças Phantom e lançadores Scythe. Uso: Participar das operações de combate da frota Drukhari.', 'Classe identificada em Battlefleet Gothic: Armada 2. A ficha registra a configuração desse jogo; isso não estabelece disponibilidade em todos os períodos do cenário ou nas regras de mesa. Materiais do casco, métodos de construção, dimensões e parâmetros de propulsão não são informados na fonte consultada.

Construção e funcionamento: A configuração apresentada no jogo reúne lanças Phantom e lançadores Scythe.

Aplicação: Participar das operações de combate da frota Drukhari.'),
  ('fragmento-estilhacante', 'Fragmento estilhaçante', 'Tecnologia', 'Criação e especificações conhecidas: Provém dos restos do portal transdimensional Mirror of Planes, recolhidos e transformados em armas por Vorsch. Uso: Destruir um alvo ao quebrar o fragmento que capturou seu reflexo.', 'A arma liga o reflexo à integridade da vítima. Seu poder deriva de um artefato dimensional preexistente, e não de um espelho comum. A origem dos fragmentos e o responsável por seu aproveitamento são conhecidos. A fonte não descreve como reproduzir o portal original ou fabricar novos fragmentos equivalentes.

Construção e funcionamento: Provém dos restos do portal transdimensional Mirror of Planes, recolhidos e transformados em armas por Vorsch.

Aplicação: Destruir um alvo ao quebrar o fragmento que capturou seu reflexo.'),
  ('frasco-de-vidro-tinta', 'Frasco de vidro-tinta', 'Tecnologia', 'Criação e especificações conhecidas: É um recipiente Drukhari destinado a vermes Shudderworms coletados. Uso: Conservar e transportar organismos usados como equipamento.', 'A fonte associa o frasco a um organismo específico, sem descrever sua composição ou processo de produção. O nome não justifica propriedades como indestrutibilidade ou proteção psíquica. É cadastrado como tecnologia de acondicionamento, distinta do verme armazenado. Sua referência é o material de Combat Patrol The Blades of Torment.

Construção e funcionamento: É um recipiente Drukhari destinado a vermes Shudderworms coletados.

Aplicação: Conservar e transportar organismos usados como equipamento.'),
  ('gancho-de-corrente', 'Gancho de corrente', 'Tecnologia', 'Criação e especificações conhecidas: Combina um gancho ofensivo com uma corrente flexível. Uso: Executar golpes em arco difíceis de bloquear.', 'Arma associada às Wyches em material de Shadow War: Armageddon. A montagem permite variar trajetória e alcance durante o ataque. Não há comprovação de um campo energético obrigatório ou de um mecanismo motorizado em todos os exemplares.

Construção e funcionamento: Combina um gancho ofensivo com uma corrente flexível.

Aplicação: Executar golpes em arco difíceis de bloquear.'),
  ('garra-de-captura', 'Garra de captura', 'Tecnologia', 'Criação e especificações conhecidas: Consiste em um gancho de captura ligado a uma corrente. Uso: Arrancar um piloto de sua prancha e capturar adversários.', 'Equipamento dos Hellions, fornecido pelos cultos de Wyches. Sua função combina agressão e captura durante o movimento. O nome inglês é preservado para distingui-lo de outras garras; a fonte consultada não estabelece uma descarga elétrica padronizada.

Construção e funcionamento: Consiste em um gancho de captura ligado a uma corrente.

Aplicação: Arrancar um piloto de sua prancha e capturar adversários.'),
  ('garra-gravitacional', 'Garra gravitacional', 'Tecnologia', 'Criação e especificações conhecidas: É instalada na parte inferior de uma Reaver Jetbike. Uso: Cortar inimigos enquanto a moto passa sobre eles.', 'A descrição consultada confirma posição e função da arma. Não apresenta uma explicação detalhada de manipulação da gravidade apesar do nome. Por isso, a ficha não acrescenta poços gravitacionais ou efeitos de massa não documentados. O processo de construção e os materiais permanecem desconhecidos.

Construção e funcionamento: É instalada na parte inferior de uma Reaver Jetbike.

Aplicação: Cortar inimigos enquanto a moto passa sobre eles.'),
  ('gestacao-artificial-acelerada', 'Gestação artificial acelerada', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza paredes de criação com tubos amnióticos onde óvulos fertilizados se desenvolvem de forma hiperacelerada. Uso: Produzir Drukhari conhecidos como Half-born.', 'O sistema explica a presença de indivíduos artificialmente gestados na sociedade de Commorragh. Gestação artificial não deve ser chamada automaticamente de clonagem: o relato menciona óvulos fertilizados. O tempo de maturação, os nutrientes e a engenharia dos tubos não são especificados. A técnica é associada aos domínios dos Haemonculi e ao trabalho de seus auxiliares.

Construção e funcionamento: Utiliza paredes de criação com tubos amnióticos onde óvulos fertilizados se desenvolvem de forma hiperacelerada.

Aplicação: Produzir Drukhari conhecidos como Half-born.'),
  ('glaive-archite', 'Glaive Archite', 'Tecnologia', 'Criação e especificações conhecidas: É uma arma de haste de fabricação especialmente refinada. Uso: Permitir golpes capazes de seccionar adversários blindados nas mãos de uma combatente habilidosa.', 'A Archite Glaive integra o armamento dos cultos Wych e é associada às Succubi. Sua eficiência também depende do treinamento do usuário. A fonte consultada não identifica liga, gerador ou processo de forja; portanto, não é correto acrescentar automaticamente darklight ou venenos à sua composição.

Construção e funcionamento: É uma arma de haste de fabricação especialmente refinada.

Aplicação: Permitir golpes capazes de seccionar adversários blindados nas mãos de uma combatente habilidosa.'),
  ('glaive-de-sangue', 'Glaive de sangue', 'Tecnologia', 'Criação e especificações conhecidas: Foi forjada pelo hemomante Organghast e reconstitui o fio a partir de matéria orgânica absorvida das vítimas. Uso: Manter uma lâmina cortante durante combates prolongados.', 'Associada ao Cult of the Red Grief, a arma descarta partes gastas e renova a borda com material recém-colhido. A autoreparação biotecnológica é seu traço distintivo. O criador é identificado, mas o processo metalúrgico ou orgânico que possibilita a renovação não é explicado.

Construção e funcionamento: Foi forjada pelo hemomante Organghast e reconstitui o fio a partir de matéria orgânica absorvida das vítimas.

Aplicação: Manter uma lâmina cortante durante combates prolongados.'),
  ('granada-de-osso-espectral', 'Granada de osso espectral', 'Tecnologia', 'Criação e especificações conhecidas: Emprega wraithbone tratado para carregar energias espirituais associadas ao medo. Uso: Liberar uma influência emocional incapacitante sobre o alvo.', 'A Wraithbone Grenade é uma munição do Terrorfex. A descrição associa sua detonação a uma névoa de energia espiritual. O processo exato de preparação permanece desconhecido. Este registro descreve a carga, enquanto Terrorfex descreve o dispositivo lançador.

Construção e funcionamento: Emprega wraithbone tratado para carregar energias espirituais associadas ao medo.

Aplicação: Liberar uma influência emocional incapacitante sobre o alvo.'),
  ('granada-de-plasma-drukhari', 'Granada de plasma Drukhari', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza uma pequena quantidade de plasma explosivo; o processo de contenção específico não é detalhado. Uso: Ofuscar defensores e facilitar assaltos a posições protegidas.', 'O uso Aeldari e Drukhari privilegia o clarão e a perturbação da defesa inimiga. Não se deve atribuir automaticamente a esse modelo todas as propriedades das granadas de plasma imperiais descritas na mesma fonte.

Construção e funcionamento: Utiliza uma pequena quantidade de plasma explosivo; o processo de contenção específico não é detalhado.

Aplicação: Ofuscar defensores e facilitar assaltos a posições protegidas.'),
  ('granada-disruptora', 'Granada disruptora', 'Tecnologia', 'Criação e especificações conhecidas: Libera um pulso eletromagnético capaz de perturbar circuitos e sistemas de energia. Uso: Desabilitar veículos e equipamentos eletrônicos.', 'A granada haywire é utilizada por Drukhari e outras forças. Fontes de diferentes épocas divergem sobre efeitos em organismos; a ficha conserva como função central a interferência eletrônica. Descrições imperiais de espíritos-máquina não devem ser automaticamente tratadas como explicação da fabricação Drukhari.

Construção e funcionamento: Libera um pulso eletromagnético capaz de perturbar circuitos e sistemas de energia.

Aplicação: Desabilitar veículos e equipamentos eletrônicos.'),
  ('granada-xenospasmo', 'Granada xenospasmo', 'Tecnologia', 'Criação e especificações conhecidas: Combina obsidiana entalhada e fragmentos de wraithbone atormentado. Uso: Direcionar estilhaços contra vítimas por ação das energias aprisionadas.', 'A Xenospasm Grenade é uma munição rara do Terrorfex. Diferencia-se da granada voltada apenas ao terror por adicionar fragmentação guiada sobrenaturalmente. A dificuldade de confecção é registrada, mas não são conhecidos os passos de fabricação.

Construção e funcionamento: Combina obsidiana entalhada e fragmentos de wraithbone atormentado.

Aplicação: Direcionar estilhaços contra vítimas por ação das energias aprisionadas.'),
  ('gume-da-dancarina', 'Gume da dançarina', 'Tecnologia', 'Criação e especificações conhecidas: Sua lâmina foi recebida dos habitantes de Aelindrach; o método de fabricação permanece desconhecido. Uso: Golpear enquanto transita entre o reino de sombras e a realidade.', 'A arma de haste deixa rastros de vapor sombrio ao mover-se. Seu comportamento dimensional a distingue de uma lâmina comum. A origem em Aelindrach não demonstra uma produção industrial acessível às Kabals. As fontes não fornecem alcance fixo, componentes internos ou condições exatas para essa transição.

Construção e funcionamento: Sua lâmina foi recebida dos habitantes de Aelindrach; o método de fabricação permanece desconhecido.

Aplicação: Golpear enquanto transita entre o reino de sombras e a realidade.'),
  ('hellglaive', 'Hellglaive', 'Tecnologia', 'Criação e especificações conhecidas: Combina uma arma de duas lâminas com uma configuração histórica que incorporava um rifle de estilhaços. Uso: Permitir ataques de Hellions durante o voo.', 'A integração do rifle é documentada na terceira edição. Configurações posteriores utilizam armas de estilhaços na prancha. A ficha conserva a distinção de época e não exige que todas as representações do Hellglaive incluam a mesma arma de disparo.

Construção e funcionamento: Combina uma arma de duas lâminas com uma configuração histórica que incorporava um rifle de estilhaços.

Aplicação: Permitir ataques de Hellions durante o voo.'),
  ('hemovoro-khaidesi', 'Hemóvoro Khaïdesi', 'Tecnologia', 'Criação e especificações conhecidas: É cultivado a partir de criaturas do rio Khaïdes e mantido por Haemonculi. Uso: Atacar inimigos próximos e consumir sangue e carne.', 'Esses organismos cartilaginosos semelhantes a vermes atuam como componentes vivos do arsenal. O cadastro trata do cultivo e emprego instrumental, não de uma espécie artificial cuja origem tenha sido comprovada. A fonte não identifica alteração genética obrigatória, método de criação ou sistema exato de controle.

Construção e funcionamento: É cultivado a partir de criaturas do rio Khaïdes e mantido por Haemonculi.

Aplicação: Atacar inimigos próximos e consumir sangue e carne.'),
  ('hexrifle', 'Hexrifle', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza cilindros de cristal contendo uma pequena quantidade do agente da Glass Plague. Uso: Vitrificar vítimas atingidas.', 'Arma associada aos Haemonculi, também representada com Wracks. Sua carga desencadeia uma transformação ficcional extremamente rápida da carne em vidro. O efeito deriva do agente transportado, e não de um raio térmico convencional. O método de preparação da carga e a origem biológica detalhada não são descritos.

Construção e funcionamento: Utiliza cilindros de cristal contendo uma pequena quantidade do agente da Glass Plague.

Aplicação: Vitrificar vítimas atingidas.'),
  ('horrorfex', 'Horrorfex', 'Tecnologia', 'Criação e especificações conhecidas: Lança granadas confeccionadas com wraithbone saqueado. Uso: Provocar medo entre tropas inimigas.', 'Versão veicular relacionada ao Terrorfex. O aproveitamento do material não demonstra fabricação própria de wraithbone.

Construção e funcionamento: Lança granadas confeccionadas com wraithbone saqueado.

Aplicação: Provocar medo entre tropas inimigas.'),
  ('hypex', 'Hypex', 'Tecnologia', 'Criação e especificações conhecidas: Fabricação não detalhada. Uso: Melhorar a rapidez de resposta.', 'O efeito é associado à iniciativa nas regras consultadas, sem fator fisiológico mensurável.

Construção e funcionamento: Fabricação não detalhada.

Aplicação: Melhorar a rapidez de resposta.'),
  ('injetor-de-icor', 'Injetor de ícor', 'Tecnologia', 'Criação e especificações conhecidas: Integra um sistema de injeção capaz de administrar o ícor mutagênico do usuário ou de uma máquina Talos. Uso: Introduzir uma carga biológica destrutiva no inimigo.', 'O dispositivo é utilizado por Haemonculi e Talos Pain Engines. Sua função conecta a química corporal modificada à ação de combate. O ícor é descrito como fervente e mutagênico, mas sua composição não é revelada. Modelos pessoais e versões montadas não precisam ter dimensões ou estrutura idênticas.

Construção e funcionamento: Integra um sistema de injeção capaz de administrar o ícor mutagênico do usuário ou de uma máquina Talos.

Aplicação: Introduzir uma carga biológica destrutiva no inimigo.'),
  ('jatos-gritantes', 'Jatos gritantes', 'Tecnologia', 'Criação e especificações conhecidas: Acrescenta propulsão a jato ao veículo. Uso: Permitir mergulho aéreo e recuperação antes do impacto.', 'O ruído da manobra aterroriza adversários. A fonte não apresenta potência ou processo de construção do motor.

Construção e funcionamento: Acrescenta propulsão a jato ao veículo.

Aplicação: Permitir mergulho aéreo e recuperação antes do impacto.'),
  ('jaula-hexagonal-runica', 'Jaula hexagonal rúnica', 'Tecnologia', 'Criação e especificações conhecidas: É um recipiente oco e poliédrico, aproximadamente esférico, decorado com runas. Uso: Transportar prisioneiros, inclusive grandes bioformas tirânidas.', 'O nome português é uma aproximação editorial de Hex Cage, não uma garantia de que todas as faces tenham seis lados. A descrição confirma grande capacidade e uso logístico. As runas são visíveis, mas seus efeitos específicos e os materiais de contenção não são explicados. Não se presume um campo de estase sem evidência.

Construção e funcionamento: É um recipiente oco e poliédrico, aproximadamente esférico, decorado com runas.

Aplicação: Transportar prisioneiros, inclusive grandes bioformas tirânidas.'),
  ('klaive', 'Klaive', 'Tecnologia', 'Criação e especificações conhecidas: É forjada em ligas de diamantina, equilibrada para manuseio leve e envolvida por energia destrutiva. Uso: Equipar os guerreiros de elite Incubi.', 'A klaive é uma arma de grande lâmina que combina trabalho metalúrgico refinado com tecnologia de arma de energia. Pode atravessar armaduras de Space Marines segundo a descrição narrativa. Sua fabricação é artesanalmente sofisticada; a fonte não divulga composição percentual da liga, dimensões obrigatórias ou alimentação energética.

Construção e funcionamento: É forjada em ligas de diamantina, equilibrada para manuseio leve e envolvida por energia destrutiva.

Aplicação: Equipar os guerreiros de elite Incubi.'),
  ('lacos-de-captura', 'Laços de captura', 'Tecnologia', 'Criação e especificações conhecidas: Reúnem correntes, chicotes, arame farpado e ganchos pendurados no veículo. Uso: Recolher vítimas durante passagens rasantes de um Raider.', 'Sistema destinado a capturar prisioneiros sem pousar. As fontes registram também designações relacionadas como Chain Snares e Bladevanes. A instalação não deve ser confundida com redes de embarque, cuja finalidade é facilitar o acesso de passageiros.

Construção e funcionamento: Reúnem correntes, chicotes, arame farpado e ganchos pendurados no veículo.

Aplicação: Recolher vítimas durante passagens rasantes de um Raider.'),
  ('lamina-dessecadora', 'Lâmina dessecadora', 'Tecnologia', 'Criação e especificações conhecidas: Incorpora um efeito de remoção da umidade; o mecanismo de fabricação não é explicado. Uso: Destruir organismos por desidratação extrema ao contato.', 'A Husk Blade está associada aos Archons e transforma vítimas em restos ressequidos. Seu perigo não decorre apenas do fio da espada. A fonte descreve o resultado do contato, mas não informa se ele depende de um campo, substância ou outro sistema. A definição evita atribuir um princípio físico que não foi documentado.

Construção e funcionamento: Incorpora um efeito de remoção da umidade; o mecanismo de fabricação não é explicado.

Aplicação: Destruir organismos por desidratação extrema ao contato.'),
  ('lamina-djin', 'Lâmina Djin', 'Tecnologia', 'Criação e especificações conhecidas: Possui aparência cristalina ou acabamento espelhado e uma consciência própria; materiais e origem variam nas descrições. Uso: Ampliar a capacidade ofensiva do portador, com risco de traição.', 'Arma senciente de Archons que seduz seu usuário e se alimenta de sua essência. Relatos descrevem uma liga desconhecida e reflexos idealizados, enquanto apresentações anteriores enfatizam cristal polido. Essas descrições são mantidas como variações editoriais, sem inventar uma composição única. A arma pode voltar-se contra quem a empunha.

Construção e funcionamento: Possui aparência cristalina ou acabamento espelhado e uma consciência própria; materiais e origem variam nas descrições.

Aplicação: Ampliar a capacidade ofensiva do portador, com risco de traição.'),
  ('lamina-esfoladora', 'Lâmina esfoladora', 'Tecnologia', 'Criação e especificações conhecidas: É uma lâmina envenenada especialmente destinada à coleta de amostras; sua fabricação não é detalhada. Uso: Retirar tecidos para as experiências do Coven of Twelve.', 'A relíquia combina arma e instrumento de experimentação. Sua descrição enfatiza a remoção habilidosa de pele, gordura e musculatura. Não há liga, substância tóxica ou criador individual especificado. Deve ser cadastrada como objeto singular de um coven, distinguindo-a das facas e ferramentas comuns de Wracks.

Construção e funcionamento: É uma lâmina envenenada especialmente destinada à coleta de amostras; sua fabricação não é detalhada.

Aplicação: Retirar tecidos para as experiências do Coven of Twelve.'),
  ('lamina-glimmersteel', 'Lâmina Glimmersteel', 'Tecnologia', 'Criação e especificações conhecidas: É trabalhada em formas cortantes, incluindo espadas e foices; a composição do material não é revelada. Uso: Servir como armamento dos Mandrakes.', 'As lâminas são descritas com aparência semelhante à de instrumentos cirúrgicos ensanguentados. O caráter sobrenatural de seus portadores não comprova que a arma disponha de campo de fase ou de um mecanismo de teletransporte próprio.

Construção e funcionamento: É trabalhada em formas cortantes, incluindo espadas e foices; a composição do material não é revelada.

Aplicação: Servir como armamento dos Mandrakes.'),
  ('lamina-hekatarii', 'Lâmina Hekatarii', 'Tecnologia', 'Criação e especificações conhecidas: Recebe produção artesanal individualizada e uma bainha com campo de afiação. Uso: Equipar combatentes com facas de corte preciso.', 'Peso, curvatura, formato e ressonância variam conforme o artesão e podem funcionar como assinatura de um culto. O campo da bainha mantém o gume. Não há dimensões ou liga metálica universais publicadas para todas as lâminas.

Construção e funcionamento: Recebe produção artesanal individualizada e uma bainha com campo de afiação.

Aplicação: Equipar combatentes com facas de corte preciso.'),
  ('lamina-shaimeshi', 'Lâmina Shaimeshi', 'Tecnologia', 'Criação e especificações conhecidas: É uma arma envenenada associada às Lhamaeans; sua confecção e suas toxinas não são especificadas. Uso: Produzir efeitos orgânicos devastadores mesmo a partir de um corte pequeno.', 'A lâmina representa o refinamento toxicológico da tradição Shaimesh. A fonte registra efeitos como corrosão interna e destruição dos tecidos, sem estabelecer que todos ocorram simultaneamente. Não deve ser transformada em uma substância única com fórmula inventada. O vínculo com as Lhamaeans é mais seguro que qualquer atribuição a um fabricante individual.

Construção e funcionamento: É uma arma envenenada associada às Lhamaeans; sua confecção e suas toxinas não são especificadas.

Aplicação: Produzir efeitos orgânicos devastadores mesmo a partir de um corte pequeno.'),
  ('lamina-venenosa', 'Lâmina venenosa', 'Tecnologia', 'Criação e especificações conhecidas: Possui milhares de microporos que liberam continuamente um elixir de hipertoxinas. Uso: Envenenar inimigos por ferimentos de lâmina.', 'O termo abrange facas, espadas, cimitarras e outras formas de arma, e não apenas um modelo fixo. O sistema de exsudação mantém o fio tóxico. É associado à aristocracia drukhari. A fonte descreve a distribuição do veneno na arma, mas não divulga sua receita ou a fabricação dos microporos.

Construção e funcionamento: Possui milhares de microporos que liberam continuamente um elixir de hipertoxinas.

Aplicação: Envenenar inimigos por ferimentos de lâmina.'),
  ('lanca-do-vazio', 'Lança do vazio', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza energia arcana recolhida em regiões arruinadas e esquecidas da Teia. Uso: Armamento pesado de bombardeiros Voidraven.', 'A Void Lance dispara pulsos de grande poder destrutivo. O local de obtenção da energia é mencionado, mas sua natureza e o procedimento de coleta não são detalhados. O registro mantém sua identidade própria, sem tratá-la automaticamente como outro nome da Dark Lance ou como uma mina do vazio reutilizável.

Construção e funcionamento: Utiliza energia arcana recolhida em regiões arruinadas e esquecidas da Teia.

Aplicação: Armamento pesado de bombardeiros Voidraven.'),
  ('lanca-negra', 'Lança negra', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza campos magnéticos de contenção e estabilização para manejar e acelerar darklight. Uso: Perfurar blindagens com plataformas móveis ou equipes de infantaria.', 'Arma pesada cujo projeto guarda semelhança com a Bright Lance aeldari, adaptado para energia de luz negra. É associada a Raiders, Ravagers e Kabalitas; também existem exemplares navais. Seu efeito devastador é descrito narrativamente, não como garantia absoluta contra qualquer defesa. O processo de obtenção da energia continua obscuro.

Construção e funcionamento: Utiliza campos magnéticos de contenção e estabilização para manejar e acelerar darklight.

Aplicação: Perfurar blindagens com plataformas móveis ou equipes de infantaria.'),
  ('lanca-phantom', 'Lança Phantom', 'Tecnologia', 'Criação e especificações conhecidas: Emprega um sistema de energia de menor potência que um Pulsar, adequado a embarcações menores. Uso: Oferecer fogo concentrado contra naves.', 'A lança aparece tanto em forças Drukhari quanto em outras frotas Aeldari. Sua inclusão representa uso documentado, não exclusividade de invenção. Não deve ser confundida com a lança negra portátil nem receber os parâmetros desta por analogia.

Construção e funcionamento: Emprega um sistema de energia de menor potência que um Pulsar, adequado a embarcações menores.

Aplicação: Oferecer fogo concentrado contra naves.'),
  ('lanca-termica', 'Lança térmica', 'Tecnologia', 'Criação e especificações conhecidas: Combina as tecnologias melta e laser de alto rendimento na aplicação drukhari. Uso: Destruir alvos resistentes a curta distância.', 'A Heat Lance concentra poder destrutivo em uma arma utilizada por Reavers e Scourges. A combinação tecnológica é apresentada como uma realização dos habitantes de Commorragh. Seu emprego favorece a aproximação rápida. A existência de versões maiores aeldari não torna seus componentes idênticos aos modelos portáteis drukhari.

Construção e funcionamento: Combina as tecnologias melta e laser de alto rendimento na aplicação drukhari.

Aplicação: Destruir alvos resistentes a curta distância.'),
  ('lancador-de-granadas-fantasma', 'Lançador de granadas fantasma', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza uma mochila modificada com tubos duplos que lançam recipientes discoides de gás neuroativo. Uso: Induzir pesadelos e delírios nos inimigos.', 'Equipamento de Drukhari ricos, o lançador oferece guerra psicológica por dispersão de uma carga química ficcional. A fonte identifica forma, suporte e efeito da munição. Não revela a composição do gás nem pressupõe um fenômeno espiritual idêntico ao das granadas de wraithbone.

Construção e funcionamento: Utiliza uma mochila modificada com tubos duplos que lançam recipientes discoides de gás neuroativo.

Aplicação: Induzir pesadelos e delírios nos inimigos.'),
  ('lancador-de-misseis-scythe', 'Lançador de mísseis Scythe', 'Tecnologia', 'Criação e especificações conhecidas: Organiza lançadores de mísseis em baterias leves ou pesadas. Uso: Compor o poder de fogo de classes de naves Drukhari.', 'Equipamento representado em Battlefleet Gothic: Armada 2. A fonte identifica suas variantes e instalação naval, mas não apresenta composição das ogivas ou fabricação. Não confundir seus mísseis com os Monoscythe de bombardeiros atmosféricos.

Construção e funcionamento: Organiza lançadores de mísseis em baterias leves ou pesadas.

Aplicação: Compor o poder de fogo de classes de naves Drukhari.'),
  ('lancador-de-tormento', 'Lançador de tormento', 'Tecnologia', 'Criação e especificações conhecidas: É instalado no casco de veículos antigravitacionais e dispara granadas farpadas carregadas com gás. Uso: Espalhar terror entre as forças inimigas.', 'As granadas produzem uma nuvem ocre que afeta a mente de quem está próximo. A integração ao veículo permite combinar movimento e desorganização do adversário. Sua aparência não permite deduzir uma fórmula química. É registrado separadamente do Phantasm Grenade Launcher, pois a plataforma e a descrição são diferentes.

Construção e funcionamento: É instalado no casco de veículos antigravitacionais e dispara granadas farpadas carregadas com gás.

Aplicação: Espalhar terror entre as forças inimigas.'),
  ('lotus-do-tumulo', 'Lótus do túmulo', 'Tecnologia', 'Criação e especificações conhecidas: Fórmula não divulgada. Uso: Aumentar a força.', 'Grave Lotus é distinta da Dark Lotus Toxin. O nome não comprova ingredientes vegetais.

Construção e funcionamento: Fórmula não divulgada.

Aplicação: Aumentar a força.'),
  ('luz-negra', 'Luz negra', 'Tecnologia', 'Criação e especificações conhecidas: Emprega energia exótica denominada darklight, associada a fenômenos celestes extremos; a coleta permanece desconhecida. Uso: Alimentar armamento antiblindagem.', 'Luz negra é o princípio energético de blasters e lanças negras. As fontes relacionam suas possíveis origens a buracos negros e tempestades do Warp, mas não descrevem um procedimento de produção. Não significa que cada arma contenha um buraco negro. A designação portuguesa é editorial; o identificador original permite distinguir a tecnologia de outras armas de energia.

Construção e funcionamento: Emprega energia exótica denominada darklight, associada a fenômenos celestes extremos; a coleta permanece desconhecida.

Aplicação: Alimentar armamento antiblindagem.'),
  ('macrobisturi', 'Macrobisturi', 'Tecnologia', 'Criação e especificações conhecidas: Emprega grandes lâminas monomoleculares montadas em uma Talos. Uso: Executar cortes cirúrgicos destrutivos em vítimas de grande porte.', 'O Macro-Scalpel amplia a estética e a função do instrumental médico para a escala de uma máquina de combate. A capacidade de cortar corpos resistentes é explicitamente descrita. Não equivale a um equipamento médico humano de precisão convencional: serve à coleta e à violência dos Haemonculi. A produção do fio não é explicada.

Construção e funcionamento: Emprega grandes lâminas monomoleculares montadas em uma Talos.

Aplicação: Executar cortes cirúrgicos destrutivos em vítimas de grande porte.'),
  ('mais-veloz-que-o-pensamento', 'Mais veloz que o pensamento', 'Tecnologia', 'Criação e especificações conhecidas: É uma droga produzida pelos Haemonculi, sem fórmula publicada. Uso: Aumentar velocidade e agilidade.', 'A referência registra um efeito de aprimoramento corporal no RPG Only War. O nome é figurativo e não comprova movimento literalmente instantâneo ou mais rápido que processos mentais em qualquer circunstância. O cadastro preserva a distinção entre descrição narrativa e estatísticas de uma edição de jogo.

Construção e funcionamento: É uma droga produzida pelos Haemonculi, sem fórmula publicada.

Aplicação: Aumentar velocidade e agilidade.'),
  ('maldicao-de-morghenna', 'Maldição de Morghenna', 'Tecnologia', 'Criação e especificações conhecidas: É uma glaive de energia de confecção excepcional; a oficina e os materiais não são identificados. Uso: Servir como arma de uma Succubus.', 'Aestra Khromys presenteou Morghenna com a arma. Uma rival assassinou a portadora para tomá-la, destino que a fonte atribui também a seus sucessores. O nome de maldição não comprova um mecanismo sobrenatural: a história também descreve a cobiça provocada pela qualidade da peça.

Construção e funcionamento: É uma glaive de energia de confecção excepcional; a oficina e os materiais não são identificados.

Aplicação: Servir como arma de uma Succubus.'),
  ('mangual-de-correntes', 'Mangual de correntes', 'Tecnologia', 'Criação e especificações conhecidas: Reúne correntes com farpas em um conjunto de ataque de um Talos. Uso: Dilacerar vítimas em combate próximo.', 'A força da máquina de dor torna o mangual uma arma devastadora contra corpos orgânicos. É uma peça do arsenal de construções biomecânicas dos Haemonculi. Materiais, torque e processo de fabricação não são especificados.

Construção e funcionamento: Reúne correntes com farpas em um conjunto de ataque de um Talos.

Aplicação: Dilacerar vítimas em combate próximo.'),
  ('manopla-de-carne', 'Manopla de carne', 'Tecnologia', 'Criação e especificações conhecidas: É uma luva em forma de garra com frascos e projeções semelhantes a seringas, carregadas com eletroesteroides ficcionais. Uso: Provocar crescimento corporal destrutivo no alvo tocado.', 'Equipamento dos Haemonculi, Wracks e Grotesques. O contato injeta uma carga que faz os tecidos crescerem de maneira incompatível com a integridade do corpo. O efeito é uma forma de biotecnologia ofensiva, distinta da manipulação óssea do Ossefactor. A composição e a fabricação da carga permanecem não especificadas.

Construção e funcionamento: É uma luva em forma de garra com frascos e projeções semelhantes a seringas, carregadas com eletroesteroides ficcionais.

Aplicação: Provocar crescimento corporal destrutivo no alvo tocado.'),
  ('manopla-de-fase-mental', 'Manopla de fase mental', 'Tecnologia', 'Criação e especificações conhecidas: Incorpora controladores neurais em uma manopla de alta tecnologia. Uso: Enfraquecer a força e a vontade de uma vítima por contato.', 'É empregada pelos Haemonculi e por algumas de suas criações. A interferência pode deter criaturas de grande porte, mas a descrição reconhece menor confiabilidade diante de adversários excepcionalmente poderosos. Não é uma transferência de consciência documentada. Sua eletrônica e seu processo de fabricação não são revelados.

Construção e funcionamento: Incorpora controladores neurais em uma manopla de alta tecnologia.

Aplicação: Enfraquecer a força e a vontade de uma vítima por contato.'),
  ('manoplas-de-hidra', 'Manoplas de hidra', 'Tecnologia', 'Criação e especificações conhecidas: São tecidas com cristais extraplanares semissencientes e flexíveis. Uso: Produzir numerosas lâminas cristalinas durante o combate.', 'Quando inativas, as manoplas apresentam superfície lisa e vítrea. Em combate, fazem surgir e desprender lâminas que multiplicam os pontos de ataque. São usadas por especialistas Wych chamadas Hydrae. A origem extraplanar do material é conhecida, mas não o processo completo de obtenção, cultivo ou comando dos cristais.

Construção e funcionamento: São tecidas com cristais extraplanares semissencientes e flexíveis.

Aplicação: Produzir numerosas lâminas cristalinas durante o combate.'),
  ('manto-de-pesadelo-drukhari', 'Manto de pesadelo Drukhari', 'Tecnologia', 'Criação e especificações conhecidas: Gera uma nuvem de sombras ao redor do usuário e de pessoas próximas. Uso: Encobrir o desembarque durante o combate.', 'Artefato Drukhari que permite ocultar o movimento inicial de um grupo. O resumo disponível confirma a função, mas não descreve emissor, materiais ou fabricação. É diferente do Nightmare Shroud Necron e não se presume que utilize metal vivo.

Construção e funcionamento: Gera uma nuvem de sombras ao redor do usuário e de pessoas próximas.

Aplicação: Encobrir o desembarque durante o combate.'),
  ('mao-tesoura', 'Mão-tesoura', 'Tecnologia', 'Criação e especificações conhecidas: É uma luva com longas lâminas nos dedos e tubos que reaplicam veneno. Uso: Cortar e intoxicar vítimas em combate próximo.', 'Empregada por Haemonculi e Wracks, combina ferramentas cortantes e abastecimento contínuo de toxina. Ferimentos pequenos podem produzir dor incapacitante ou morte segundo a narrativa. O sistema de tubos é conhecido, mas a composição do veneno e a fabricação da luva não. Não é apenas uma prótese com tesouras convencionais.

Construção e funcionamento: É uma luva com longas lâminas nos dedos e tubos que reaplicam veneno.

Aplicação: Cortar e intoxicar vítimas em combate próximo.'),
  ('maquina-de-dor-talos', 'Máquina de dor Talos', 'Tecnologia', 'Criação e especificações conhecidas: É construída por Haemonculi como uma combinação semissenciente de componentes orgânicos, estrutura mecânica e sustentação antigravitacional. Uso: Combater, proteger seu mestre, coletar amostras e realizar tortura.', 'Cada Talos carrega características de seu criador. Pode receber macrobisturis, injetores, correntes e armas de disparo. O organismo e a máquina funcionam como uma unidade, sem reduzir-se a um robô convencional. A fonte apresenta variações de projeto, mas não um procedimento padronizado de criação.

Construção e funcionamento: É construída por Haemonculi como uma combinação semissenciente de componentes orgânicos, estrutura mecânica e sustentação antigravitacional.

Aplicação: Combater, proteger seu mestre, coletar amostras e realizar tortura.'),
  ('maquina-parasita-cronos', 'Máquina parasita Cronos', 'Tecnologia', 'Criação e especificações conhecidas: Combina matéria orgânica, mecanismos antigravitacionais e um circuito de energia negativa produzido por ciência e alquimia. Uso: Drenar a vitalidade de vítimas e revigorar aliados.', 'O Cronos processa e amplifica a energia capturada, criando um efeito restaurador ao redor. Pode receber Spirit Vortex e Spirit Probe. Sua semelhança externa com Talos não significa função idêntica: a transferência de vitalidade é sua característica central. A fonte não explica a engenharia completa desse circuito.

Construção e funcionamento: Combina matéria orgânica, mecanismos antigravitacionais e um circuito de energia negativa produzido por ciência e alquimia.

Aplicação: Drenar a vitalidade de vítimas e revigorar aliados.'),
  ('mascara-dos-condenados', 'Máscara dos condenados', 'Tecnologia', 'Criação e especificações conhecidas: Projeta visões perturbadoras na mente do observador; a construção permanece desconhecida. Uso: Explorar os medos profundos de uma vítima e interromper suas ações.', 'A fonte da terceira edição descreve colapso e incapacidade de reagir diante das visões. O mecanismo exato não é explicado. Sua atuação mental distingue o artefato de uma armadura comum, mas não demonstra que o portador possua poderes psíquicos pessoais. O nome original evita confusão com máscaras de outras facções.

Construção e funcionamento: Projeta visões perturbadoras na mente do observador; a construção permanece desconhecida.

Aplicação: Explorar os medos profundos de uma vítima e interromper suas ações.'),
  ('mascara-dos-cranios-gritantes', 'Máscara dos crânios gritantes', 'Tecnologia', 'Criação e especificações conhecidas: É formada com a face esfolada ainda viva de um Farseer Asuryani e fragmentos de pedras espirituais. Uso: Transmitir presságios que ajudem o portador a evitar desfechos desfavoráveis.', 'A máscara mantém uma alma cativa que comunica visões perturbadas de possibilidades futuras. O efeito se aproxima do Soulhelm, mas as fontes dão nomes e formas próprios; por isso recebem registros distintos. A fonte está ligada ao codex da décima edição. O ritual completo de confecção não é detalhado.

Construção e funcionamento: É formada com a face esfolada ainda viva de um Farseer Asuryani e fragmentos de pedras espirituais.

Aplicação: Transmitir presságios que ajudem o portador a evitar desfechos desfavoráveis.'),
  ('mascara-infernal', 'Máscara infernal', 'Tecnologia', 'Criação e especificações conhecidas: É uma máscara capaz de gerar pavor antinatural; seus componentes não são revelados. Uso: Distrair oponentes e prejudicar a precisão de seus ataques.', 'A descrição da terceira edição relaciona a aura da máscara à abertura de oportunidades de combate. Não há evidência suficiente para atribuir gás, hologramas ou um organismo interno. É mantida separada da Vexator Mask, cujo efeito se baseia em imagens familiares.

Construção e funcionamento: É uma máscara capaz de gerar pavor antinatural; seus componentes não são revelados.

Aplicação: Distrair oponentes e prejudicar a precisão de seus ataques.'),
  ('mascara-vexatoria', 'Máscara vexatória', 'Tecnologia', 'Criação e especificações conhecidas: Pode assumir a forma de uma trama de pele e osso marcada com runas. Uso: Projetar aparências familiares que façam o adversário hesitar.', 'O dispositivo explora a percepção emocional, fazendo o inimigo reconhecer alguém amado ou respeitado. Seu valor é a distração no momento decisivo. A referência também menciona a denominação antiga Vexanthrope, com ressalva de citação. O mecanismo de projeção e a confecção detalhada não são revelados.

Construção e funcionamento: Pode assumir a forma de uma trama de pele e osso marcada com runas.

Aplicação: Projetar aparências familiares que façam o adversário hesitar.'),
  ('metalotoxinas', 'Metalotoxinas', 'Tecnologia', 'Criação e especificações conhecidas: Abrangem compostos ácidos, venenos que atacam materiais ferrosos ou nanófagos inorgânicos. Uso: Degradar blindagens e incapacitar veículos.', 'A categoria amplia a ideia Drukhari de veneno para alvos não orgânicos. As placas podem dissolver-se ou sofrer alterações destrutivas ao redor da tripulação. As alternativas não devem ser tratadas como ingredientes obrigatórios de uma só mistura. A fonte é uma descrição de estratagema da nona edição e não fornece receitas ou processos industriais.

Construção e funcionamento: Abrangem compostos ácidos, venenos que atacam materiais ferrosos ou nanófagos inorgânicos.

Aplicação: Degradar blindagens e incapacitar veículos.'),
  ('mina-do-vazio', 'Mina do vazio', 'Tecnologia', 'Criação e especificações conhecidas: Possui duas cargas: a primeira delimita uma bolha na realidade; a segunda libera uma partícula de darklight. Uso: Aniquilar alvos em uma área delimitada após lançamento por um Voidraven.', 'A sequência evita que o efeito alcance a própria aeronave. A implosão deixa uma cratera hemisférica, segundo a narrativa. A mina não é uma munição comum enterrada no solo, mas um armamento aéreo extremamente destrutivo. Não foram divulgados o processo de fabricação ou a dimensão fixa de seu efeito.

Construção e funcionamento: Possui duas cargas: a primeira delimita uma bolha na realidade; a segunda libera uma partícula de darklight.

Aplicação: Aniquilar alvos em uma área delimitada após lançamento por um Voidraven.'),
  ('minas-de-fluxo-temporal', 'Minas de fluxo temporal', 'Tecnologia', 'Criação e especificações conhecidas: Empregam um princípio de manipulação temporal cujo mecanismo de fabricação não é divulgado. Uso: Aplicar efeitos temporais como arma.', 'Temporal-Flux Mines são citadas entre os armamentos temporais usados por Drukhari. A referência consultada confirma a associação, mas não permite fixar raio, duração ou um efeito específico de envelhecimento ou congelamento. A ficha mantém essas especificações como desconhecidas.

Construção e funcionamento: Empregam um princípio de manipulação temporal cujo mecanismo de fabricação não é divulgado.

Aplicação: Aplicar efeitos temporais como arma.'),
  ('missil-de-congelamento-e-fragmentacao', 'Míssil de congelamento e fragmentação', 'Tecnologia', 'Criação e especificações conhecidas: A carga Shatterfield possui uma etapa de retirada de calor e outra de impacto destrutivo. Uso: Congelar e depois despedaçar alvos.', 'A sequência de duas detonações é o aspecto distintivo da munição. Não há parâmetros térmicos ou materiais de construção documentados na fonte consultada.

Construção e funcionamento: A carga Shatterfield possui uma etapa de retirada de calor e outra de impacto destrutivo.

Aplicação: Congelar e depois despedaçar alvos.'),
  ('missil-de-implosao', 'Míssil de implosão', 'Tecnologia', 'Criação e especificações conhecidas: Incorpora um campo de dissonância molecular. Uso: Fazer os alvos atingidos colapsarem sobre si mesmos.', 'Munição transportada por bombardeiros Voidraven. O efeito descrito é uma implosão associada ao campo liberado pelo míssil, deixando vestígios carbonizados. A descrição não informa materiais da ogiva, método de guiagem ou mecanismo de produção do campo. Não deve ser confundido com a Void Mine de duas cargas.

Construção e funcionamento: Incorpora um campo de dissonância molecular.

Aplicação: Fazer os alvos atingidos colapsarem sobre si mesmos.'),
  ('missil-de-necrotoxina', 'Míssil de necrotoxina', 'Tecnologia', 'Criação e especificações conhecidas: A carga Necrotoxin dispersa estilhaços portadores de neuroveneno. Uso: Ferir, envenenar e suprimir inimigos.', 'Munição aérea cuja ação combina fragmentos e carga tóxica. A composição e a fabricação não são informadas; seu efeito não deve ser confundido com uma descarga de darklight.

Construção e funcionamento: A carga Necrotoxin dispersa estilhaços portadores de neuroveneno.

Aplicação: Ferir, envenenar e suprimir inimigos.'),
  ('missil-monofoice', 'Míssil monofoice', 'Tecnologia', 'Criação e especificações conhecidas: A carga Monoscythe libera uma onda de energia à altura da cabeça. Uso: Atacar grupos de inimigos em uma passagem aérea.', 'É uma das munições históricas descritas para o Voidraven. A fonte explica o efeito de corte, mas não o projeto da ogiva ou o sistema de guiagem.

Construção e funcionamento: A carga Monoscythe libera uma onda de energia à altura da cabeça.

Aplicação: Atacar grupos de inimigos em uma passagem aérea.'),
  ('modulo-de-assalto-impaler', 'Módulo de assalto Impaler', 'Tecnologia', 'Criação e especificações conhecidas: Consiste em uma grande embarcação de assalto, instalada na proa por exceder as dimensões dos hangares comuns. Uso: Transportar numerosos combatentes para subjugar uma nave inimiga.', 'O módulo privilegia a concentração de tropas e tem alcance operacional limitado. Sua função é permitir a conquista do alvo por abordagem. Não confundir com a arma de haste Impaler usada em arenas: são equipamentos distintos que compartilham o nome.

Construção e funcionamento: Consiste em uma grande embarcação de assalto, instalada na proa por exceder as dimensões dos hangares comuns.

Aplicação: Transportar numerosos combatentes para subjugar uma nave inimiga.'),
  ('modulo-de-estilhacos', 'Módulo de estilhaços', 'Tecnologia', 'Criação e especificações conhecidas: Instala um mecanismo semelhante ao rifle splinter sob uma prancha Hellion, acionado por controles nos calcanhares. Uso: Disparar durante o voo mantendo as mãos disponíveis.', 'A instalação integra o armamento venenoso à prancha. O piloto pode manejar sua arma corpo a corpo enquanto aciona o módulo com os pés. A fonte não publica cadência, capacidade de munição ou desenho interno dos controles.

Construção e funcionamento: Instala um mecanismo semelhante ao rifle splinter sob uma prancha Hellion, acionado por controles nos calcanhares.

Aplicação: Disparar durante o voo mantendo as mãos disponíveis.'),
  ('modulo-de-ferroes', 'Módulo de ferrões', 'Tecnologia', 'Criação e especificações conhecidas: É um sistema de armas instalado no Talos; a natureza da carga não é detalhada. Uso: Disparar pulsos descritos como agonia pura.', 'A fonte não afirma que o Stinger Pod use a mesma munição bacteriana da Stinger Pistol. Essa distinção impede preencher uma lacuna com uma analogia incorreta. Seu papel ofensivo é conhecido, porém material, alimentação, mecanismo e método de fabricação permanecem desconhecidos.

Construção e funcionamento: É um sistema de armas instalado no Talos; a natureza da carga não é detalhada.

Aplicação: Disparar pulsos descritos como agonia pura.'),
  ('moto-a-jato-reaver', 'Moto a jato Reaver', 'Tecnologia', 'Criação e especificações conhecidas: Emprega antigravidade, propulsão veloz e um casco que recebe lâminas, armas e acessórios. Uso: Realizar corridas mortais, ataques de passagem e incursões.', 'A Reaver estende a agilidade de seu piloto e é ajustada individualmente para desempenho. Seu armamento pode variar entre rifle splinter, blaster e lança térmica. O veículo é uma plataforma, não uma unidade orgânica. Não há motivo para atribuir a todos os exemplares a mesma configuração ou velocidade numérica.

Construção e funcionamento: Emprega antigravidade, propulsão veloz e um casco que recebe lâminas, armas e acessórios.

Aplicação: Realizar corridas mortais, ataques de passagem e incursões.'),
  ('motor-mimetico', 'Motor mimético', 'Tecnologia', 'Criação e especificações conhecidas: Projeta uma assinatura aparente que imita outras classes de naves. Uso: Aproximar-se de vítimas sem revelar imediatamente a identidade Drukhari.', 'Pode simular embarcações imperiais, Aeldari, Orks, do Caos ou T''au. A fonte exclui naves Necrons e Tyranids. Trata-se de disfarce da aparência detectada, não de transformação física comprovada do casco. A arquitetura interna dos emissores não é descrita.

Construção e funcionamento: Projeta uma assinatura aparente que imita outras classes de naves.

Aplicação: Aproximar-se de vítimas sem revelar imediatamente a identidade Drukhari.'),
  ('municao-cacadora-de-almas', 'Munição caçadora de almas', 'Tecnologia', 'Criação e especificações conhecidas: Substitui cristais splinter comuns por cristais impregnados de wraithbone atormentado. Uso: Alterar a trajetória de projéteis em direção a seres vivos.', 'As energias aprisionadas na munição são descritas como capazes de conduzir fragmentos ao redor de obstáculos. Essa orientação espiritual não equivale a uma mira eletrônica convencional. O tratamento do material não é explicado em detalhe. Trata-se de equipamento de edições antigas; a página de referência apresenta ressalvas de citação que merecem conferência no codex original.

Construção e funcionamento: Substitui cristais splinter comuns por cristais impregnados de wraithbone atormentado.

Aplicação: Alterar a trajetória de projéteis em direção a seres vivos.'),
  ('orbe-do-desespero', 'Orbe do desespero', 'Tecnologia', 'Criação e especificações conhecidas: É uma esfera negra pesada, desenvolvida pelo coven The Hex, que contém energia negativa. Uso: Provocar sofrimento mental e intensificá-lo por realimentação.', 'O dispositivo torna-se mais potente ao alimentar-se da tristeza que causa. A comparação narrativa com um buraco negro descreve esse comportamento de absorção, sem provar a existência de uma singularidade física em seu interior. Os segredos de criação são rigidamente guardados pelo coven.

Construção e funcionamento: É uma esfera negra pesada, desenvolvida pelo coven The Hex, que contém energia negativa.

Aplicação: Provocar sofrimento mental e intensificá-lo por realimentação.'),
  ('ossefator', 'Ossefator', 'Tecnologia', 'Criação e especificações conhecidas: Foi desenvolvido pelo coven The Hex a partir do estudo das mutações ósseas de Space Marines Black Dragons capturados. Uso: Manipular o crescimento dos ossos ou convertê-lo em ataque.', 'Instrumento médico reaproveitado para guerra, o ossefator atua por ondas de impulsão osteocítica. Seu uso ofensivo provoca crescimento ósseo descontrolado, capaz de ferir a própria vítima e pessoas próximas. É um dos exemplos com origem de desenvolvimento identificada. A fonte não oferece um projeto reproduzível ou parâmetros de operação.

Construção e funcionamento: Foi desenvolvido pelo coven The Hex a partir do estudo das mutações ósseas de Space Marines Black Dragons capturados.

Aplicação: Manipular o crescimento dos ossos ou convertê-lo em ataque.'),
  ('painbringer', 'Painbringer', 'Tecnologia', 'Criação e especificações conhecidas: Composição desconhecida. Uso: Aumentar a resistência.', 'Estimulante Wych; não implica imunidade a ferimentos.

Construção e funcionamento: Composição desconhecida.

Aplicação: Aumentar a resistência.'),
  ('panaceia-pervertida', 'Panaceia pervertida', 'Tecnologia', 'Criação e especificações conhecidas: Telexis desenvolveu uma versão drukhari inspirada na Panacea humana, cujo STC foi roubado por Lady Malys em Verdigris IX. Uso: Aumentar a regeneração e a resistência a venenos.', 'A relíquia demonstra apropriação e transformação de conhecimento alheio pelos Haemonculi. O fluido proporciona proteção extraordinária, descrita como quase imunidade, sem justificar imunidade absoluta a qualquer ameaça. A fonte não fornece sua fórmula. A origem humana do modelo e a adaptação drukhari devem permanecer distintas no cadastro.

Construção e funcionamento: Telexis desenvolveu uma versão drukhari inspirada na Panacea humana, cujo STC foi roubado por Lady Malys em Verdigris IX.

Aplicação: Aumentar a regeneração e a resistência a venenos.'),
  ('pedra-de-sangue', 'Pedra de sangue', 'Tecnologia', 'Criação e especificações conhecidas: É produzida a partir da pedra espiritual quebrada de um Exarca aeldari. Uso: Emitir um pulso capaz de fazer o sangue de um inimigo ferver.', 'Artefato raro associado aos Incubi, a Bloodstone reaproveita um receptáculo espiritual como arma. O componente de origem é conhecido, mas os procedimentos de transformação não. Trata-se de um termo estabelecido próximo ao exemplo de nome sugerido para o cadastro; não deve ser confundido com o material homônimo ligado aos Blood Angels.

Construção e funcionamento: É produzida a partir da pedra espiritual quebrada de um Exarca aeldari.

Aplicação: Emitir um pulso capaz de fazer o sangue de um inimigo ferver.'),
  ('pele-endurecida', 'Pele endurecida', 'Tecnologia', 'Criação e especificações conhecidas: Forma-se por alterações e agressões acumuladas que tornam a pele espessa e coriácea. Uso: Oferecer proteção corporal aos Haemonculi e suas criações.', 'Gnarlskin designa uma condição protetora do próprio corpo, tratada aqui como resultado de modificação biológica. Não é necessariamente um traje removível. Sua resistência é comparada à de certas armaduras, sem medidas universais. A fonte não descreve um protocolo padronizado para produzir essa pele em todos os indivíduos.

Construção e funcionamento: Forma-se por alterações e agressões acumuladas que tornam a pele espessa e coriácea.

Aplicação: Oferecer proteção corporal aos Haemonculi e suas criações.'),
  ('perfurador-da-teia', 'Perfurador da Teia', 'Tecnologia', 'Criação e especificações conhecidas: Modifica uma tecnologia aeldari antiga para produzir aberturas temporárias. Uso: Entrar e sair da Teia por rasgos artificiais.', 'O dispositivo é descrito no codex da décima edição e deixa danos onde atua. Sua existência demonstra uma forma específica de abertura, sem provar capacidade irrestrita de construir toda uma rede dimensional nova. O aparelho é separado do portal portátil convencional porque seu método e consequências são diferentes.

Construção e funcionamento: Modifica uma tecnologia aeldari antiga para produzir aberturas temporárias.

Aplicação: Entrar e sair da Teia por rasgos artificiais.'),
  ('pistola-blaster', 'Pistola blaster', 'Tecnologia', 'Criação e especificações conhecidas: A Blast Pistol é uma versão de mão da plataforma blaster. Uso: Oferecer luz negra em uma arma secundária compacta.', 'A pistola preserva a função de concentrar energia destrutiva em um equipamento portátil. Seu nome original é Blast Pistol. A fonte consultada a identifica como a redução do blaster para uso manual; não fornece dimensões, autonomia ou processo próprio de fabricação. Não confundir com pistolas laser homônimas de outras forças.

Construção e funcionamento: A Blast Pistol é uma versão de mão da plataforma blaster.

Aplicação: Oferecer luz negra em uma arma secundária compacta.'),
  ('pistola-de-estilhacos', 'Pistola de estilhaços', 'Tecnologia', 'Criação e especificações conhecidas: Compacta o mecanismo splinter e utiliza um cristal de munição menor para reduzir o peso. Uso: Armar combatentes de assalto com disparos venenosos de curto alcance.', 'Empregada por Archons, Wyches, pilotos de Reaver e outros líderes, costuma acompanhar uma arma corpo a corpo. Conserva o princípio do rifle, mas reduz alcance e volume do conjunto. O cristal menor e a elevada importância das toxinas distinguem sua configuração.

Construção e funcionamento: Compacta o mecanismo splinter e utiliza um cristal de munição menor para reduzir o peso.

Aplicação: Armar combatentes de assalto com disparos venenosos de curto alcance.'),
  ('pistola-de-ferroes', 'Pistola de ferrões', 'Tecnologia', 'Criação e especificações conhecidas: Dispara pequenas agulhas hipodérmicas que carregam um agente biológico exótico ficcional. Uso: Atacar organismos vivos com munição dos Haemonculi.', 'A Stinger lembra uma pistola splinter compacta, mas usa outra carga. Na descrição consultada, o agente se multiplica no corpo atingido e pode provocar ruptura violenta, com fragmentos contaminados atingindo outras vítimas. O funcionamento pertence à ficção de Warhammer; a fonte não revela composição ou processo de fabricação.

Construção e funcionamento: Dispara pequenas agulhas hipodérmicas que carregam um agente biológico exótico ficcional.

Aplicação: Atacar organismos vivos com munição dos Haemonculi.'),
  ('plataforma-rampage', 'Plataforma Rampage', 'Tecnologia', 'Criação e especificações conhecidas: Monta duas posições de tripulação, escudo energético, lança negra de disparo rotativo e canhões de estilhaços em uma plataforma antigravitacional. Uso: Fornecer apoio de fogo pesado.', 'Projeto experimental de veículo apresentado em Chapter Approved 2001. A descrição inclui porte superior ao Ravager, três motores e cinco aletas traseiras. Deve ser identificado como design histórico, sem pressupor produção em série ou presença regular nas forças contemporâneas.

Construção e funcionamento: Monta duas posições de tripulação, escudo energético, lança negra de disparo rotativo e canhões de estilhaços em uma plataforma antigravitacional.

Aplicação: Fornecer apoio de fogo pesado.'),
  ('poder-de-pesadelo', 'Poder de pesadelo', 'Tecnologia', 'Criação e especificações conhecidas: É uma droga criada por Haemonculi; ingredientes e preparo não são descritos. Uso: Aumentar intensamente a força.', 'A substância é documentada no RPG Only War: Enemies of the Imperium. O nome português é editorial. A fonte permite identificar criadores e efeito principal, mas não efeitos colaterais universais, duração ou compatibilidade com qualquer espécie. Não é automaticamente a mesma preparação que Grave Lotus.

Construção e funcionamento: É uma droga criada por Haemonculi; ingredientes e preparo não são descritos.

Aplicação: Aumentar intensamente a força.'),
  ('portal-negro', 'Portal negro', 'Tecnologia', 'Criação e especificações conhecidas: É um tetraedro rúnico que abre uma passagem para zonas proibidas da Teia. Uso: Expor inimigos às criaturas que habitam essas regiões.', 'Transportado por Haemonculi, o dispositivo é arremessado para criar um perigo localizado. Sua função é ofensiva, diferente do portal portátil empregado para passagem de tropas. A geometria externa é descrita, mas a construção das runas e os mecanismos de ligação dimensional permanecem desconhecidos.

Construção e funcionamento: É um tetraedro rúnico que abre uma passagem para zonas proibidas da Teia.

Aplicação: Expor inimigos às criaturas que habitam essas regiões.'),
  ('portal-portatil-da-teia', 'Portal portátil da Teia', 'Tecnologia', 'Criação e especificações conhecidas: É um dispositivo transportável capaz de abrir acesso à Teia; a fonte não revela sua fabricação. Uso: Introduzir ou retirar combatentes do campo de batalha.', 'O portal é um meio de passagem entre o espaço real e a rede extradimensional aeldari. Pode ser transportado e ativado no terreno, sem ser consumido necessariamente pelo uso. Não significa que os Drukhari criaram toda a Teia. A segurança de uma passagem não permite afirmar que todas as regiões da rede sejam seguras.

Construção e funcionamento: É um dispositivo transportável capaz de abrir acesso à Teia; a fonte não revela sua fabricação.

Aplicação: Introduzir ou retirar combatentes do campo de batalha.'),
  ('praga-de-vidro', 'Praga de vidro', 'Tecnologia', 'Criação e especificações conhecidas: Jalaxlar isolou um agente que converte matéria viva em vidro; o coven The Hex conteve um surto e aproveitou a descoberta militarmente. Uso: Vitrificar organismos, inclusive por meio do Hexrifle.', 'A descoberta foi inicialmente apresentada como produção de esculturas. Sua liberação acidental expôs a natureza das obras e causou uma epidemia em Commorragh. A descrição atribui à praga a capacidade de impedir a restauração habitual das vítimas pelos Haemonculi. O agente e seu antagonista são ficcionais; não existem fórmulas ou métodos técnicos publicados na referência consultada.

Construção e funcionamento: Jalaxlar isolou um agente que converte matéria viva em vidro; o coven The Hex conteve um surto e aproveitou a descoberta militarmente.

Aplicação: Vitrificar organismos, inclusive por meio do Hexrifle.'),
  ('prancha-celeste-hellion', 'Prancha celeste Hellion', 'Tecnologia', 'Criação e especificações conhecidas: É uma plataforma antigravitacional individual com controles de alta sensibilidade e possíveis Splinter Pods. Uso: Transportar Hellions e Beastmasters em manobras rápidas.', 'A prancha recebe farpas, lâminas e personalizações. Seus usuários podem empregar correntes com ganchos para manter-se presos durante o voo. Representa independência nas gangues de Commorragh, embora tenha prestígio inferior ao de uma Reaver. Material estrutural e projeto dos geradores não são descritos.

Construção e funcionamento: É uma plataforma antigravitacional individual com controles de alta sensibilidade e possíveis Splinter Pods.

Aplicação: Transportar Hellions e Beastmasters em manobras rápidas.'),
  ('proa-de-choque', 'Proa de choque', 'Tecnologia', 'Criação e especificações conhecidas: Instala um aríete energizado que emite ondas direcionais de força eletromagnética. Uso: Abrir caminho por formações de infantaria e atingir veículos.', 'O efeito combina a investida da plataforma antigravitacional com energia projetada pela proa. Não é apenas uma lâmina decorativa. A fonte identifica o princípio de funcionamento, mas não apresenta potência, alcance das ondas ou materiais do gerador.

Construção e funcionamento: Instala um aríete energizado que emite ondas direcionais de força eletromagnética.

Aplicação: Abrir caminho por formações de infantaria e atingir veículos.'),
  ('projetor-de-vortice-de-tempestade', 'Projetor de vórtice de tempestade', 'Tecnologia', 'Criação e especificações conhecidas: É alimentado pela câmara de vórtice do Reaper com energia recolhida nas torres de Commorragh. Uso: Disparar um feixe concentrado ou uma explosão eletromagnética.', 'A descarga pode comprometer veículos e sistemas nervosos. O aparelho articula coleta energética, armazenamento e emissão destrutiva. Sua apresentação não fornece o mecanismo físico completo da câmara nem a potência do feixe. O termo vórtice não deve ser interpretado automaticamente como uma abertura para o Warp.

Construção e funcionamento: É alimentado pela câmara de vórtice do Reaper com energia recolhida nas torres de Commorragh.

Aplicação: Disparar um feixe concentrado ou uma explosão eletromagnética.'),
  ('punisher-de-incubus', 'Punisher de Incubus', 'Tecnologia', 'Criação e especificações conhecidas: Combina haste ajustável, lâmina monomolecular e campo de choque. Uso: Realizar golpes de grande poder com o armamento dos Incubi.', 'Arma descrita no material da terceira edição. A haste permite adaptar a empunhadura e a lâmina concentra o efeito ofensivo. Não confundir com canhões Punisher imperiais; esta entrada trata exclusivamente da arma Drukhari.

Construção e funcionamento: Combina haste ajustável, lâmina monomolecular e campo de choque.

Aplicação: Realizar golpes de grande poder com o armamento dos Incubi.'),
  ('raider', 'Raider', 'Tecnologia', 'Criação e especificações conhecidas: Combina casco leve, sustentação antigravitacional, motores compactos e velas etéreas. Uso: Transportar guerreiros e apoiar incursões rápidas.', 'Principal transporte Drukhari, inspirado nas embarcações de prazer do antigo império aeldari. O convés aberto permite aos passageiros combater durante a aproximação. Pode receber lança negra, desintegrador e acessórios. Sua construção sacrifica resistência para preservar velocidade; as fontes não oferecem uma especificação industrial única para todas as Kabals.

Construção e funcionamento: Combina casco leve, sustentação antigravitacional, motores compactos e velas etéreas.

Aplicação: Transportar guerreiros e apoiar incursões rápidas.'),
  ('ramificacao-de-frascos', 'Ramificação de frascos', 'Tecnologia', 'Criação e especificações conhecidas: Reúne frascos usados no pulso ou no ombro, ligados a um sistema de aplicação de drogas na coluna da Succubus. Uso: Administrar estimulantes ao longo da batalha.', 'A relíquia está associada ao Cult of Strife. Sua característica é a combinação de reservatórios e aplicação progressiva de um coquetel de combate. A fonte não descreve doses ou fórmulas. O registro apresenta o equipamento de administração, sem tratá-lo como uma nova espécie de droga única.

Construção e funcionamento: Reúne frascos usados no pulso ou no ombro, ligados a um sistema de aplicação de drogas na coluna da Succubus.

Aplicação: Administrar estimulantes ao longo da batalha.'),
  ('ravager', 'Ravager', 'Tecnologia', 'Criação e especificações conhecidas: Transforma uma plataforma próxima ao Raider em uma canhoneira com três posições de armamento pesado. Uso: Atacar blindados, fortificações e concentrações inimigas.', 'O Ravager combina mobilidade, sistemas de mira e armamento como lanças negras ou desintegradores. Sua doutrina depende de aparecer, concentrar fogo e mudar de posição. A proteção permanece limitada em comparação com veículos de guerra mais pesados. Não existe um único fabricante ou esquema de montagem universal documentado.

Construção e funcionamento: Transforma uma plataforma próxima ao Raider em uma canhoneira com três posições de armamento pesado.

Aplicação: Atacar blindados, fortificações e concentrações inimigas.'),
  ('reaper', 'Reaper', 'Tecnologia', 'Criação e especificações conhecidas: Seu casco rápido é construído ao redor de um único Storm Vortex Projector. Uso: Desabilitar veículos e apoiar a captura de transportes.', 'O Reaper é uma canhoneira rara e cara, cuja arma pode comprometer alvos preservando parte de sua carga. Assim como outras plataformas Drukhari, depende de velocidade e manobra para sobreviver. Os acessórios variam. A referência de fabricação descreve a organização do casco, não um processo industrial completo.

Construção e funcionamento: Seu casco rápido é construído ao redor de um único Storm Vortex Projector.

Aplicação: Desabilitar veículos e apoiar a captura de transportes.'),
  ('reconstrucao-e-ressurreicao-dos-haemonculi', 'Reconstrução e ressurreição dos Haemonculi', 'Tecnologia', 'Criação e especificações conhecidas: Emprega reconstrução de tecidos e ciência da alma, com preservação de restos ou de parte da essência. Uso: Restituir corpos e devolver indivíduos à vida.', 'Os Haemonculi oferecem esse serviço mediante pactos. Alguns preservam a própria essência em recipientes rúnicos ou espaços extradimensionais. A prática não garante recuperação após destruição completa de corpo e alma. Não é uma tecnologia de imortalidade absoluta.

Construção e funcionamento: Emprega reconstrução de tecidos e ciência da alma, com preservação de restos ou de parte da essência.

Aplicação: Restituir corpos e devolver indivíduos à vida.'),
  ('rede-de-estilhacos', 'Rede de estilhaços', 'Tecnologia', 'Criação e especificações conhecidas: Combina a estrutura de uma rede com eletrificação. Uso: Imobilizar adversários e impedir sua reação.', 'A Shardnet é empregada pelas Wyches, frequentemente em conjunto com um Impaler. A combinação permite controlar o oponente antes de atingi-lo com a arma de haste. Sua função tecnológica é contenção ofensiva. A fonte não fornece materiais, tensão elétrica ou instruções para a confecção da malha.

Construção e funcionamento: Combina a estrutura de uma rede com eletrificação.

Aplicação: Imobilizar adversários e impedir sua reação.'),
  ('rede-de-sub-reinos-de-commorragh', 'Rede de sub-reinos de Commorragh', 'Tecnologia', 'Criação e especificações conhecidas: Portais e caminhos dimensionais interligam regiões que podem estar muito distantes no espaço real. Uso: Unir domínios, portos e bairros da Cidade Sombria.', 'Este é um termo descritivo editorial para a infraestrutura, não o nome de uma máquina única. O controle das ligações permite isolar regiões em crises. A rede combina herança antiga e intervenções posteriores; seu processo completo de construção não é conhecido.

Construção e funcionamento: Portais e caminhos dimensionais interligam regiões que podem estar muito distantes no espaço real.

Aplicação: Unir domínios, portos e bairros da Cidade Sombria.'),
  ('redes-de-embarque', 'Redes de embarque', 'Tecnologia', 'Criação e especificações conhecidas: São redes penduradas entre o convés de um Raider e o solo. Uso: Facilitar o embarque e o desembarque de combatentes.', 'Melhoria descrita no codex da terceira edição. A facilidade de acesso também pode beneficiar inimigos que tentem abordar o transporte. O equipamento é simples em comparação com artefatos dimensionais, mas continua sendo uma solução tecnológica de mobilidade. A fonte não identifica um material exclusivo.

Construção e funcionamento: São redes penduradas entre o convés de um Raider e o solo.

Aplicação: Facilitar o embarque e o desembarque de combatentes.'),
  ('remodelagem-corporal-dos-wracks', 'Remodelagem corporal dos Wracks', 'Tecnologia', 'Criação e especificações conhecidas: Combina cirurgias, drogas, esteroides e enxertos, incluindo estruturas ósseas estimuladas por soros. Uso: Transformar voluntários em assistentes e combatentes dos Haemonculi.', 'A tecnologia é o processo de modificação corporal, não a categoria social Wrack em si. Os corpos são reforçados e reorganizados, podendo integrar armas e próteses. A produção de estruturas ósseas externas exemplifica a manipulação de crescimento. Não existe uma receita única ou protocolo cirúrgico completo publicado.

Construção e funcionamento: Combina cirurgias, drogas, esteroides e enxertos, incluindo estruturas ósseas estimuladas por soros.

Aplicação: Transformar voluntários em assistentes e combatentes dos Haemonculi.'),
  ('retalhador', 'Retalhador', 'Tecnologia', 'Criação e especificações conhecidas: Projeta uma malha expansível de monofilamentos com minúsculas farpas. Uso: Enredar e cortar inimigos.', 'O Shredder transforma uma rede quase invisível em arma de ataque. A malha prende o alvo e seus movimentos agravam os cortes. É empregado sobretudo por guerreiros Drukhari. A fonte descreve a carga e o efeito, mas não explica como os filamentos são produzidos ou acondicionados antes do disparo.

Construção e funcionamento: Projeta uma malha expansível de monofilamentos com minúsculas farpas.

Aplicação: Enredar e cortar inimigos.'),
  ('rifle-de-estilhacos', 'Rifle de estilhaços', 'Tecnologia', 'Criação e especificações conhecidas: Integra cristal de munição, gerador de fragmentação, alimentador cíclico e câmara de impulso magnetoelétrico. Uso: Equipar guerreiros Kabalitas em incursões.', 'O rifle leve constitui uma das armas mais comuns de Commorragh. Fragmenta sua reserva cristalina e lança os projéteis em velocidade supersônica; a neurotoxina agrava os ferimentos. Pode incorporar lâminas para combate próximo. Não confundir com armamento shuriken dos Asuryani: a toxicidade da munição é central para seu funcionamento.

Construção e funcionamento: Integra cristal de munição, gerador de fragmentação, alimentador cíclico e câmara de impulso magnetoelétrico.

Aplicação: Equipar guerreiros Kabalitas em incursões.'),
  ('serpentin', 'Serpentin', 'Tecnologia', 'Criação e especificações conhecidas: A fonte descreve sua produção a partir de fluidos extraídos de cadáveres de Wyches. Uso: Aprimorar a atuação do usuário em combate.', 'Droga de combate de origem Drukhari, associada ao repertório químico de Commorragh. A informação sobre a matéria-prima não constitui uma fórmula: tratamento, dosagem e etapas de produção não são divulgados. A ficha não presume um aprimoramento permanente.

Construção e funcionamento: A fonte descreve sua produção a partir de fluidos extraídos de cadáveres de Wyches.

Aplicação: Aprimorar a atuação do usuário em combate.'),
  ('sifao-espiritual', 'Sifão espiritual', 'Tecnologia', 'Criação e especificações conhecidas: Integra os mecanismos biomecânicos e esotéricos construídos pelos Haemonculi para o Cronos. Uso: Drenar a essência vital das vítimas.', 'O Spirit Syphon é identificado no índice oficial Drukhari como equipamento do Cronos. O conjunto parasitário reduz vítimas a cascas sem vida e permite redistribuir vitalidade a outros Drukhari. A fonte não descreve materiais ou etapas de fabricação. As estatísticas pertencem à publicação, sem equivalência direta com medidas físicas.

Construção e funcionamento: Integra os mecanismos biomecânicos e esotéricos construídos pelos Haemonculi para o Cronos.

Aplicação: Drenar a essência vital das vítimas.'),
  ('sois-cativos-de-commorragh', 'Sóis cativos de Commorragh', 'Tecnologia', 'Criação e especificações conhecidas: Estrelas foram transferidas do espaço real para sub-reinos da Teia antes da Queda. Uso: Fornecer energia e iluminação à Cidade Sombria.', 'Os Illmaea sustentam parte da infraestrutura de Commorragh. São uma herança de engenharia aeldari antiga mantida pelos Drukhari. A fonte não descreve como se efetua a transferência estelar ou como toda a energia é distribuída.

Construção e funcionamento: Estrelas foram transferidas do espaço real para sub-reinos da Teia antes da Queda.

Aplicação: Fornecer energia e iluminação à Cidade Sombria.'),
  ('sonda-espiritual', 'Sonda espiritual', 'Tecnologia', 'Criação e especificações conhecidas: Utiliza um tubo cristalino e estriado, semelhante a uma probóscide, suspenso da cabeça do Cronos. Uso: Extrair diretamente a força vital de vítimas imobilizadas.', 'O Cronos prende a vítima com seus tentáculos e introduz a sonda para drenar sua essência. Forma, instalação e uso são conhecidos; o processamento da energia espiritual não é descrito em termos de engenharia. A sonda é distinta do vórtice espiritual de ataque a distância.

Construção e funcionamento: Utiliza um tubo cristalino e estriado, semelhante a uma probóscide, suspenso da cabeça do Cronos.

Aplicação: Extrair diretamente a força vital de vítimas imobilizadas.'),
  ('sopro-da-agonia', 'Sopro da agonia', 'Tecnologia', 'Criação e especificações conhecidas: É um veneno criado pelas Lhamaeans; sua composição não é revelada. Uso: Provocar morte rápida.', 'A fonte de Only War identifica os produtores e a finalidade, mas não informa meio de aplicação, aparência ou sintomas detalhados. O cadastro preserva essa limitação em vez de transformar o nome em uma suposição de gás. Não é possível estabelecer equivalência química com outros venenos Drukhari a partir do relato disponível.

Construção e funcionamento: É um veneno criado pelas Lhamaeans; sua composição não é revelada.

Aplicação: Provocar morte rápida.'),
  ('splintermind', 'Splintermind', 'Tecnologia', 'Criação e especificações conhecidas: Fórmula desconhecida. Uso: Aprimorar capacidades de liderança.', 'Efeito expresso como abstração de jogo. O mecanismo neuroquímico não é descrito.

Construção e funcionamento: Fórmula desconhecida.

Aplicação: Aprimorar capacidades de liderança.'),
  ('suporte-commorrita-de-estimulantes', 'Suporte commorrita de estimulantes', 'Tecnologia', 'Criação e especificações conhecidas: Reúne reservatórios de drogas e agulhas conectadas ao corpo do usuário. Uso: Selecionar e administrar substâncias durante o combate.', 'O dispositivo é usado nas arenas Drukhari. Um exemplar roubado por Lucius foi implantado por Fabius Bile, mostrando circulação da tecnologia fora da facção. A criação do equipamento continua de origem commorrita; esse episódio não torna toda a tecnologia uma invenção de Bile. Fórmulas e doses não são apresentadas.

Construção e funcionamento: Reúne reservatórios de drogas e agulhas conectadas ao corpo do usuário.

Aplicação: Selecionar e administrar substâncias durante o combate.'),
  ('suportes-de-armas-splinter', 'Suportes de armas splinter', 'Tecnologia', 'Criação e especificações conhecidas: Mantêm armas carregadas em suportes de veículos antigravitacionais. Uso: Permitir que passageiros substituam rapidamente armas descarregadas e sustentem o fogo.', 'Os racks tornam mais eficiente o disparo embarcado. Na descrição consultada, a vantagem vem de trocar a arma vazia por outra pronta, não de uma fabricação automática de munição. O registro distingue armazenamento e abastecimento de mecanismos ofensivos novos. Sua montagem exata varia conforme o veículo.

Construção e funcionamento: Mantêm armas carregadas em suportes de veículos antigravitacionais.

Aplicação: Permitir que passageiros substituam rapidamente armas descarregadas e sustentem o fogo.'),
  ('talisma-de-petrificacao', 'Talismã de petrificação', 'Tecnologia', 'Criação e especificações conhecidas: É um talismã de poderes estranhos cuja fabricação não é descrita. Uso: Imobilizar temporariamente inimigos que o observam.', 'Sua descrição vem da habilidade de um Haemonculus em Dawn of War: Soulstorm. A imobilização não comprova transformação material em pedra, apesar do nome. O registro marca a origem em jogo eletrônico e a possibilidade de diferenças com representações posteriores. Alcance e duração dependem das regras daquela obra.

Construção e funcionamento: É um talismã de poderes estranhos cuja fabricação não é descrita.

Aplicação: Imobilizar temporariamente inimigos que o observam.'),
  ('tantalus', 'Tantalus', 'Tecnologia', 'Criação e especificações conhecidas: Foi concebido para Surasis Grief com casco duplo, reatores potentes, propulsão aprimorada e lâminas Scythevane. Uso: Conduzir assaltos e combinar ataques de passagem com fogo pesado.', 'O Tantalus é um grande veículo antigravitacional armado com desintegradores de pulso. Seu projeto inicialmente singular foi copiado e comercializado depois da morte de seu proprietário. A fonte identifica origem e componentes, sem fornecer plantas completas. Sua presença em Imperial Armour deve ser distinguida da disponibilidade em listas atuais de jogo.

Construção e funcionamento: Foi concebido para Surasis Grief com casco duplo, reatores potentes, propulsão aprimorada e lâminas Scythevane.

Aplicação: Conduzir assaltos e combinar ataques de passagem com fogo pesado.'),
  ('terrorfex', 'Terrorfex', 'Tecnologia', 'Criação e especificações conhecidas: É um lançador de pulso que utiliza granadas de wraithbone e munições especiais raras. Uso: Paralisar adversários por medo e desespero.', 'Equipamento de infantaria descrito em material antigo dos Dark Eldar. Sua munição explora energias espirituais atormentadas. A versão de Dawn of War: Soulstorm apresenta diferenças de representação; elas não definem automaticamente o funcionamento de todos os exemplares. A fabricação do lançador não é detalhada.

Construção e funcionamento: É um lançador de pulso que utiliza granadas de wraithbone e munições especiais raras.

Aplicação: Paralisar adversários por medo e desespero.'),
  ('tormentor-peitoral', 'Tormentor peitoral', 'Tecnologia', 'Criação e especificações conhecidas: É confeccionado a partir de uma pedra espiritual quebrada de um Aeldari. Uso: Projetar terror e malícia sobre a mente de inimigos.', 'O dispositivo é portado no peito de um Incubus. Sua confecção está associada ao costume de derrotar um Guerreiro de Aspecto e quebrar a pedra da vítima. A fonte descreve a origem do componente e seu efeito psíquico, mas não detalha a engenharia da montagem.

Construção e funcionamento: É confeccionado a partir de uma pedra espiritual quebrada de um Aeldari.

Aplicação: Projetar terror e malícia sobre a mente de inimigos.'),
  ('torpedo-sanguessuga', 'Torpedo sanguessuga', 'Tecnologia', 'Criação e especificações conhecidas: Transporta um mecanismo que drena a energia da embarcação atingida. Uso: Enfraquecer sistemas inimigos e facilitar a captura.', 'O torpedo Leech atende à preferência Drukhari por incapacitar presas úteis. O efeito conhecido é a drenagem de energia; o mecanismo de acoplamento, a capacidade energética e o processo de construção da ogiva não foram especificados.

Construção e funcionamento: Transporta um mecanismo que drena a energia da embarcação atingida.

Aplicação: Enfraquecer sistemas inimigos e facilitar a captura.'),
  ('toxina-do-lotus-negro', 'Toxina do lótus negro', 'Tecnologia', 'Criação e especificações conhecidas: Seu preparo é um segredo preservado pelos envenenadores do Cult of Strife. Uso: Vaporizar o sangue das vítimas dentro de suas veias.', 'A toxina é registrada como uma relíquia em War Zone Charadon: Act I. O efeito narrativo é conhecido, mas fórmula, ingredientes e processo de produção não são divulgados. Não deve ser confundida automaticamente com Grave Lotus, uma droga de combate associada ao aumento de força.

Construção e funcionamento: Seu preparo é um segredo preservado pelos envenenadores do Cult of Strife.

Aplicação: Vaporizar o sangue das vítimas dentro de suas veias.'),
  ('traje-de-guerra-dos-incubi', 'Traje de guerra dos Incubi', 'Tecnologia', 'Criação e especificações conhecidas: É uma armadura ritual avançada, ajustada ao corpo. Uso: Proteger Incubi durante combates próximos.', 'A fonte destaca sua capacidade de desviar golpes sem apresentar materiais ou sistemas internos. A função ritual acompanha a função militar, mas não permite presumir propriedades psíquicas. O cadastro refere-se à armadura dos codices, distinguindo-a das melhorias com nomes próprios do jogo Dawn of War: Soulstorm.

Construção e funcionamento: É uma armadura ritual avançada, ajustada ao corpo.

Aplicação: Proteger Incubi durante combates próximos.'),
  ('traje-entretecido-de-osso-espectral', 'Traje entretecido de osso espectral', 'Tecnologia', 'Criação e especificações conhecidas: Recebe lascas de wraithbone saqueadas de inimigos dos mundos-nave. Uso: Aumentar a vitalidade do usuário.', 'Melhoria descrita em Dawn of War: Soulstorm. A origem do material é pilhagem, não produção demonstrada de wraithbone pelos Drukhari. A fonte não explica como o entretecimento causa o efeito. Sua inclusão documenta uma representação específica, sem transformar a armadura em equipamento padrão de toda a facção.

Construção e funcionamento: Recebe lascas de wraithbone saqueadas de inimigos dos mundos-nave.

Aplicação: Aumentar a vitalidade do usuário.'),
  ('traje-wych', 'Traje Wych', 'Tecnologia', 'Criação e especificações conhecidas: É um traje corporal flexível com proteção assimétrica e áreas deliberadamente descobertas. Uso: Acompanhar os movimentos de gladiadoras dos cultos Wych.', 'O traje concentra proteção no lado mais exposto ao adversário e deixa outras partes livres, conciliando combate e apresentação nas arenas. Não oferece a mesma proposta defensiva de uma armadura pesada. A fonte descreve seu desenho funcional, sem identificar a fibra, o fabricante ou o processo de produção.

Construção e funcionamento: É um traje corporal flexível com proteção assimétrica e áreas deliberadamente descobertas.

Aplicação: Acompanhar os movimentos de gladiadoras dos cultos Wych.'),
  ('trava-de-almas', 'Trava de almas', 'Tecnologia', 'Criação e especificações conhecidas: É um grande aparelho que precisa de dois ou mais Kabalitas para ser transportado. Uso: Sifonar almas de circuitos de infinito ou capturar espíritos errantes.', 'A Wraithlock opera sobre matrizes e entidades espirituais, ampliando a pilhagem Drukhari para além de bens físicos. Seu porte a diferencia de uma Soul-Trap pessoal. A fonte não divulga componentes, alimentação ou processo de montagem. A função é conhecida por narrativa literária, não por um perfil universal de jogo.

Construção e funcionamento: É um grande aparelho que precisa de dois ou mais Kabalitas para ser transportado.

Aplicação: Sifonar almas de circuitos de infinito ou capturar espíritos errantes.'),
  ('trono-negro', 'Trono Negro', 'Tecnologia', 'Criação e especificações conhecidas: É um projeto de reconstrução xenos do Trono Dourado, desenvolvido com informações obtidas em negociações clandestinas com o Adeptus Mechanicus. Uso: Tentar controlar o acesso à Teia e conter incursões demoníacas em Commorragh.', 'O projeto aparece em Vaults of Terra: The Dark City. Exigiria um operador psíquico poderoso; a hipótese de um clone do Imperador é apresentada como especulação de Erasmus Crowl. Instalações e amostras foram destruídas durante a intervenção imperial. Não há confirmação de conclusão ou funcionamento. Não confundir com o Dark Throne necron.

Construção e funcionamento: É um projeto de reconstrução xenos do Trono Dourado, desenvolvido com informações obtidas em negociações clandestinas com o Adeptus Mechanicus.

Aplicação: Tentar controlar o acesso à Teia e conter incursões demoníacas em Commorragh.'),
  ('velas-etereas', 'Velas etéreas', 'Tecnologia', 'Criação e especificações conhecidas: Aproveitam energia da Teia, inclusive a emitida por seus portais. Uso: Auxiliar a subida e a descida de veículos como Raiders e Ravagers.', 'As velas integram o sistema de mobilidade dos veículos Drukhari. Sua forma visual lembra uma vela, mas a fonte atribui sua ação à energia extradimensional, não apenas ao vento atmosférico. A composição da superfície e o mecanismo de conversão não são explicados. Não equivalem a motores Warp imperiais.

Construção e funcionamento: Aproveitam energia da Teia, inclusive a emitida por seus portais.

Aplicação: Auxiliar a subida e a descida de veículos como Raiders e Ravagers.'),
  ('venom', 'Venom', 'Tecnologia', 'Criação e especificações conhecidas: Integra sustentação antigravitacional, propulsores auxiliares, controles sensíveis e campo cintilante em um casco pequeno. Uso: Transportar pequenas equipes de elite ou comandantes.', 'O Venom é valorizado por sua agilidade e capacidade de acessar passagens estreitas. Possui armamento splinter e lâminas de casco em configurações descritas pelas fontes. Também é utilizado por outros grupos aeldari, portanto não é uma invenção exclusivamente drukhari comprovada. O processo de produção não é divulgado.

Construção e funcionamento: Integra sustentação antigravitacional, propulsores auxiliares, controles sensíveis e campo cintilante em um casco pequeno.

Aplicação: Transportar pequenas equipes de elite ou comandantes.'),
  ('veu-de-obsidiana', 'Véu de obsidiana', 'Tecnologia', 'Criação e especificações conhecidas: Adapta a tecnologia dos Night Shields veiculares a um campo de deslocamento de amplo espectro pessoal. Uso: Envolver o portador em sombras e dificultar ataques.', 'A relíquia é descrita pela relação com uma tecnologia já usada nas aeronaves e veículos Drukhari. Essa relação sustenta a função de ocultação, mas não permite deduzir a composição do aparelho a partir de seu nome. Obsidian Veil não significa necessariamente uma peça feita integralmente de obsidiana.

Construção e funcionamento: Adapta a tecnologia dos Night Shields veiculares a um campo de deslocamento de amplo espectro pessoal.

Aplicação: Envolver o portador em sombras e dificultar ataques.'),
  ('virus-do-duplo', 'Vírus do duplo', 'Tecnologia', 'Criação e especificações conhecidas: É uma arma transmórfica de fabricação não explicada, empregada por Vhane Kyharc. Uso: Modificar a aparência de seres vivos para reproduzir a imagem de um indivíduo.', 'O episódio de Phlogiston VI descreve criaturas adquirindo a aparência do Archon da Kabal of the Black Myriad. A fonte é White Dwarf 273. O relato sustenta transformação física, mas não transferência de memória, personalidade ou lealdade. O nome original segue a grafia Doppleganger Virus utilizada pela referência.

Construção e funcionamento: É uma arma transmórfica de fabricação não explicada, empregada por Vhane Kyharc.

Aplicação: Modificar a aparência de seres vivos para reproduzir a imagem de um indivíduo.'),
  ('vitalidade-antinatural', 'Vitalidade antinatural', 'Tecnologia', 'Criação e especificações conhecidas: É uma preparação dos Haemonculi de composição desconhecida. Uso: Reforçar regeneração e sobrevivência a ferimentos graves.', 'A droga permite suportar lesões que seriam normalmente fatais, segundo a descrição de Only War. Isso não equivale a ressurreição garantida após qualquer destruição. A fonte não identifica duração, etapas de fabricação ou um mecanismo orgânico específico. É mantida separada da Panacea Perverted, uma relíquia com origem própria.

Construção e funcionamento: É uma preparação dos Haemonculi de composição desconhecida.

Aplicação: Reforçar regeneração e sobrevivência a ferimentos graves.'),
  ('vortice-espiritual', 'Vórtice espiritual', 'Tecnologia', 'Criação e especificações conhecidas: É um dispositivo com inscrições espirais instalado em máquinas Cronos. Uso: Projetar forças negativas a distância e drenar almas.', 'A arma estende a capacidade ofensiva do Cronos para além de vítimas imediatamente próximas. A fonte identifica o dispositivo e seu efeito, sem descrever o gerador ou a geometria dos campos. Deve ser diferenciada do Storm Vortex Projector, que atua por energia eletromagnética e equipa o Reaper.

Construção e funcionamento: É um dispositivo com inscrições espirais instalado em máquinas Cronos.

Aplicação: Projetar forças negativas a distância e drenar almas.')
on conflict (slug) do nothing;

commit;

-- Verificação: deve mostrar 204 linhas com categoria = 'Tecnologia'.
select count(*) from public.glossario where categoria = 'Tecnologia';
