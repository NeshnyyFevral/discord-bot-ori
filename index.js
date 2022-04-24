const { Client, Intents } = require('discord.js');
const { prefix, token } = require("./config.json");
/* const ytdl = require("ytdl-core"); */
/* const { video_basic_info, stream} = require('play-dl'); */

const play = require('play-dl'); // Everything
const ytpl = require('ytpl');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require("@discordjs/voice");

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });
const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;
	
  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  }
	else if (message.content.startsWith(`${prefix}hello`)) {
    message.channel.send("Привет! Меня зовут Ori. Я музыкальный бот и могу воспроизводить треки из YouTube по url. Вот список команд:\n1) !time - локальное время\n2) !info - небольшая информация о моём создателе\n3) !playMusic - воспроизведение музыки из YouTube\n4) !skip - переход к следующему треку из очереди\n5) !pause - приостановка песен из очереди\n5) !resume - возобновление песен из очереди\n6) !stop - очистка очереди и остановка воспризведения песен\n7) !hello - вновь увидеть эту надпись\n <^-^>");
    return;
  }
	else if (message.content.startsWith(`${prefix}info`)) {
    message.channel.send("Моего создателя зовут Туровский Иван, студент Брянского ГТУ группы O-20-ИВТ2-по-Б. А я - всего лишь жалкая курсовая работа, написанная им на языке программирования JavaSript.");
    return;
  }
	else if (message.content.startsWith(`${prefix}time`)) {
    const date = new Date().toLocaleString();
		message.channel.send(`Текущее время: ${date}`);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  }
	else if (message.content.startsWith(`${prefix}pause`)) {
		pause(message, serverQueue);
    return;
  }
	else if (message.content.startsWith(`${prefix}resume`)) {
		resume(message, serverQueue);
    return;
  }
	else if (message.content.startsWith(`${prefix}list`)) {
    playlist(message, serverQueue);
    return;
  }
  else if (message.content.startsWith(`${prefix}tracklist`)) {
    tracklist(message, serverQueue);
    return;
  }
  else if (message.content.startsWith(`${prefix}random`)) {
    randomTrack(message, serverQueue);
    return;
  } else {
    message.channel.send("Вам нужно ввести правильную команду!");
  }
});
// -------------------------------------------------
async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "Вы должны быть в голосовом канале для воспроизведения музыки!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "Мне нужны разрешения, чтобы присоединиться и говорить в вашем голосовом канале!"
    );
  }
	let songInfo;
	try{
  	songInfo = await play.video_basic_info(args[1]);
	}catch{
		return message.channel.send("Введён некорректный url");
	};

	const song = {
  	  title: songInfo.video_details.title,
  	  url: songInfo.video_details.url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);
    queueContruct.songs.push(song);

    try {
      const connection = joinVoiceChannel({
    		channelId: message.member.voice.channel.id,
    		guildId: message.guild.id,
    		adapterCreator: message.guild.voiceAdapterCreator,
				selfDeaf: false,
    		selfMute: false
			});
      queueContruct.connection = connection;
      playMusic(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`**${song.title}** был добавлен в очередь!`);
  }
}

async function playlist(message, serverQueue) {
	const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "Вы должны быть в голосовом канале для воспроизведения музыки!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "Мне нужны разрешения, чтобы присоединиться и говорить в вашем голосовом канале!"
    );
  }
	if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);
    try {
      const connection = joinVoiceChannel({
    		channelId: message.member.voice.channel.id,
    		guildId: message.guild.id,
    		adapterCreator: message.guild.voiceAdapterCreator,
				selfDeaf: false,
    		selfMute: false
			});
			queueContruct.connection = connection;

			const playlist = await ytpl(args[1]);
			playlist.items.forEach((element) => {
				const song = {
  	  		title: element.title,
  	  		url: element.url,
  			};
				queueContruct.songs.push(song);
			})
		}catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send("Неверный url плейлиста");
    }
    playMusic(message.guild, queueContruct.songs[0]);
	} else {
    const playlist = await ytpl(args[1]);
		playlist.items.forEach((element) => {
			const song = {
  			title: element.title,
  			url: element.url,
  		};
			serverQueue.songs.push(song);
		})
    message.channel.send("Весь плейлист добавлен в очередь!");
  }
}

function tracklist(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Вы должны быть в голосовом канале, чтобы просмотреть список треков!"
    );
  if (!serverQueue)
    return message.channel.send("Треклист пуст!");
  /* console.log(serverQueue); */
  let titleMessage = '';
  for (let i = 0; i < serverQueue.songs.length - 1; i++){
    if (i <= 15) titleMessage += `${i + 1}  -  ${serverQueue.songs[i].title}\n↓\n`;
    else{
      titleMessage += '\n↓\n...';
      break
    };
  }
  message.channel.send(titleMessage);
}

function randomTrack(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Вы должны быть в голосовом канале, чтобы запустить случайный трек!"
    );
  if (!serverQueue)
    return message.channel.send("Треклист пуст!");
  pause(message, serverQueue);
  connection = joinVoiceChannel({
    channelId: message.member.voice.channel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
		selfDeaf: false,
    selfMute: false
	});
  serverQueue.songs.sort(()=>Math.random()-0.5);
  playMusic(message.guild, serverQueue.songs[0]);
}

function pause(message, serverQueue) {
	if (!message.member.voice.channel)
    return message.channel.send(
      "Вы должны быть в голосовом канале, чтобы поставить музыку на паузу!"
    );
  if (!serverQueue)
    return message.channel.send("Нет песни, которую я мог бы поставить на паузу!");
	serverQueue.connection.disconnect();
}

function resume(message, serverQueue) {
	if (!message.member.voice.channel)
    return message.channel.send(
      "Вы должны быть в голосовом канале, чтобы я мог воспроизвести музыку!"
    );
  if (!serverQueue){
    return message.channel.send("Нет песни, которую я мог бы воспроизвести!");
	}
	connection = joinVoiceChannel({
    channelId: message.member.voice.channel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
		selfDeaf: false,
    selfMute: false
	});
  playMusic(message.guild, serverQueue.songs[0]);
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Вы должны быть в голосовом канале, чтобы остановить музыку!"
    );
  if (!serverQueue)
    return message.channel.send("Нет песни, которую я мог бы пропустить!");
  serverQueue.songs.shift();
	playMusic(message.guild, serverQueue.songs[0]);
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Вы должны быть в голосовом канале, чтобы остановить музыку!"
    );
    
  if (!serverQueue)
    return message.channel.send("Нет песни, которую я мог бы остановить!");
    
  serverQueue.songs = [];
	playMusic(message.guild, serverQueue.songs[0]);
}

async function playMusic(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.connection.disconnect();
    queue.delete(guild.id);
    return;
  }
	
	/* const streamMus = ytdl(song.url, { filter: "audioonly" }); */
  const streamMus = await play.stream(song.url);
	const resource = createAudioResource(streamMus.stream, { inputType: streamMus.type });
	const player = createAudioPlayer({
		behaviors: {
			noSubscriber: NoSubscriberBehavior.Pause,
		},
	});

	await player.play(resource);
  serverQueue.connection.subscribe(player);
	

	player.on('error', (error) => console.error(error));
	player.on(AudioPlayerStatus.Idle, () => {
		console.log(`song's finished`);
		serverQueue.songs.shift();
		playMusic(guild, serverQueue.songs[0]);
		player.stop();
  });
  /* const dispatcher = serverQueue.connection.playMusic(stream).on("finish", () => {
  }).on("error", error => console.error(error)); */
  /* dispatcher.setVolumeLogarithmic(serverQueue.volume / 5); */
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(token);