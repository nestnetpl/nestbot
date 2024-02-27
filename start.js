const { Client, Collection, MessageEmbed } = require("discord.js");
const client = new Client({ intents: 32767 });
const fs = require("fs");
const axios = require('axios');
require('dotenv').config();

client.login(process.env.TOKEN);

process.on("uncaughtException", console.log);

client.collection_slash = new Collection();

fs.readdirSync("./slash").forEach((dirs) => {
  const files = fs
    .readdirSync(`./slash/${dirs}`)
    .filter((files) => files.endsWith(".js"));
  for (const file of files) {
    const slash = require(`./slash/${dirs}/${file}`);
    client.collection_slash.set(slash.data.name, slash);
  }
});

fs.readdirSync("./events").forEach((dirs) => {
  const files = fs
    .readdirSync(`./events/${dirs}`)
    .filter((files) => files.endsWith(".js"));
  for (const file of files) {
    const event = require(`./events/${dirs}/${file}`);
    client.on(event.name, (...args) => event.execute(client, ...args));
  }
});

const lastCommandUsage = {};

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {
    const currentTime = Date.now();
    const cooldown = 10000;

    const parts = message.content.split('/');
    if (parts.length !== 2) return;

    if (lastCommandUsage[message.author.id] && (currentTime - lastCommandUsage[message.author.id]) < cooldown) {
      const remainingTime = (lastCommandUsage[message.author.id] + cooldown - currentTime) / 1000;
      message.reply(`Please wait ${remainingTime.toFixed(1)} seconds before using this command again.`);
      return;
    }

    const [username, repo] = parts;

    const apiUrl = `https://api.github.com/repos/${username}/${repo}`;

    const response = await axios.get(apiUrl);
    const data = response.data;

    if (!data || Object.keys(data).length === 0) {
        throw new Error('Repository not found.');
    }

    const thumbnailUrl = data.owner.avatar_url;

    const embed = new MessageEmbed()
        .setAuthor({ name: username, iconURL: thumbnailUrl, url: 'https://github.com/' + username})
        .setTitle(username + "/" + repo)
        .setURL(data.html_url)
        .setDescription(data.description || 'No description provided.')
        .setFooter({ text: `⭐ ${data.stargazers_count} • 👀 ${data.watchers_count} • 🍴 ${data.forks} • 🎈 ${data.open_issues}` });

    message.reply({ embeds: [embed] });
    lastCommandUsage[message.author.id] = currentTime;
  } catch (error) {
    console.error('Error:', error.message);
  }
});

module.exports = client;