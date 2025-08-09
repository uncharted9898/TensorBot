// TensorBot v3 
// A Discord bot to Monitor TensorDock Servers
// Created by Uncharted@ ~2024

require('dotenv').config();
const request = require('request');
const cron = require('node-cron');
const qs = require('qs');
const { Client, ChannelType, GatewayIntentBits } = require('discord.js');

const bot = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const storage = [];

const botToken = process.env.BOT_TOKEN;
const apiKey = process.env.API_KEY;
const apiToken = process.env.API_TOKEN;
const guildID = process.env.GUILD_ID;

bot.login(botToken);

let summaryData;
let hostnodes;
let guild;

bot.on('ready', () => {
  console.log('Bot ready!');
  guild = bot.guilds.cache.get(guildID);
  updateMessages();
});


async function fetchData() {
  try {
    const data = {
      'api_key': apiKey,
      'api_token': apiToken,
      'period': getThisMonth()
    };

    const options = {
      'method': 'POST',
      'url': 'https://marketplace.tensordock.com/api/v0/billing/summary',
      'headers': {},
      'form': data
    };
    
    const response = await new Promise((resolve, reject) => {
      request(options, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    const retdata = JSON.parse(response.body);
    //console.log(retdata);
    return retdata;
  } catch (error) {
    console.error(error);
    throw error; // Re-throw the error to handle it properly
  }
}

async function fetchRevenue(startTimestamp, endTimestamp, hostnodeID) {
  try {
    const data = {
      'api_key': apiKey,
      'api_token': apiToken,
      'start_timestamp': startTimestamp,
      'end_timestamp': endTimestamp,
      'hostnode_id': hostnodeID
    };

    const options = {
      'method': 'POST',
      'url': 'https://marketplace.tensordock.com/api/v0/billing/revenue',
      'headers': {},
      'form': data
    };

    const response = await new Promise((resolve, reject) => {
      request(options, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    const retdata = JSON.parse(response.body);
    //console.log(retdata);
    return retdata;
  } catch (error) {
    console.error(error);
    throw error; // Re-throw the error to handle it properly
  }
}


async function updateMessages() {
  try {
    const summaryResponse = await fetchData();
    console.log(summaryResponse);
    if (!Array.isArray(summaryResponse.transactions.vm_payouts)) {
      throw new Error('Invalid data format'); // added .hostnodes
    }

    const payouts = summaryResponse.transactions.vm_payouts;
    const uniqueHostnodes = new Set();
    payouts.forEach((payout) => {
      uniqueHostnodes.add(payout.hostnode_id);
    });
    
    hostnodes = Array.from(uniqueHostnodes);;

    console.log(hostnodes);

    // Fetch revenue data
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // Months are 0-based, so add 1 to get the correct month number
    const firstDay = new Date(currentYear, currentMonth - 1, 1); // Get the first day of the month
    const today = new Date();
    
    const startDateStr = `${firstDay.getFullYear()}-${('0' + (firstDay.getMonth() + 1)).slice(-2)}-${('0' + firstDay.getDate()).slice(-2)}`;
    const endDateStr = `${today.getFullYear()}-${('0' + (today.getMonth() + 1)).slice(-2)}-${('0' + today.getDate()).slice(-2)}`;

    console.log(startDateStr);
    console.log(endDateStr);
    
    const revenueData = await Promise.all(hostnodes.map(async (hostnode) => {
      try {
        const retRevData = await fetchRevenue(startDateStr, endDateStr, hostnode);
        console.log('---**--');
        console.log(retRevData);
        console.log('---**--');
        return retRevData.result.data;
      } catch (error) {
        console.error(error);
        throw error; // Re-throw the error to handle it properly
      }
    }));

    // Create channels for each hostnode
    const hostnodeChannels = {};
    for (const hostnode of hostnodes) {
      const channelName = `${hostnode}`;
      let existingChannel = guild.channels.cache.find((channel) => channel.name === channelName);
      if (!existingChannel) {     
        try {
          const createdChannel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: guild.channels.cache.find((channel) => channel.name === 'TensorDock') });
          hostnodeChannels[channelName] = createdChannel;
        } catch (error) {
          console.error(error);
        }
      } else {
        hostnodeChannels[channelName] = existingChannel;
      }
    }

    // Delete old messages
    for (const [channelId, channel] of Object.entries(hostnodeChannels)) {
      //console.log("*");
      //console.log(channelId);
      //console.log(channel);
      //console.log("*");
      
      if (channel.id) {
        //console.log(channel.id);
        //const channelObj = guild.channels.cache.get(channel.id);
        //if (!channelObj) continue;
    
        const messages = await channel.messages.fetch({ limit: 100 });
        if (messages.size > 0) {
          await messages.forEach(message => message.delete());
        }
      }
    }

    // Create the Embeds
    const hardwareEmbeds = [];
    const revenueEmbeds = [];
    const activeVMsEmbeds = [];
    
    revenueData.forEach((hostnode) => {
      //hostnode = hostnode.result.data;  // Add .result.data to each hostnode
      const hardwareEmbed = {
        title: `Hostnode ${hostnode.hostnode_id} - Hardware`,
        description: `Host Hardware`,
        fields: [
          {
            name: 'Storage',
            value: `**Used:** ${hostnode.used_storage} GB\n**Available:** ${hostnode.available_storage} GB`,
          },
          {
            name: 'GPUs',
            value: `**Used:** ${hostnode.used_gpus}\n**Available:** ${hostnode.available_gpus}`,
          },
          {
            name: 'CPUs',
            value: `**Used:** ${hostnode.used_cpus}\n**Available:** ${hostnode.available_cpus}`,
          },
          {
            name: 'RAM',
            value: `**Used:** ${hostnode.used_ram} GB\n **Available:** ${hostnode.available_ram} GB`,
          },
        ],
      };
      hardwareEmbeds.push(hardwareEmbed);
    
      const revenueEmbed = {
        title: `Hostnode ${hostnode.hostnode_id} - Revenue`,
        description: `Per Hour Total(s)`,
        fields: [
          { name: 'Storage', value: `${hostnode.revenue_storage} USD` },
          { name: 'Compute', value: `${hostnode.revenue_compute} USD` },
          { name: 'Total', value: `${Number(hostnode.revenue_storage) + Number(hostnode.revenue_compute)} USD` },
        ],
      };
      revenueEmbeds.push(revenueEmbed);

      console.log('-----');
      console.log(hostnode);
      console.log('-----');
      
      const activeVMsTitle = `Hostnode ${hostnode.hostnode_id} - Active VMs`;
      const activeVMsDescription = `Location: ${hostnode.location}`;
      let activeVMsFields;
      
      if (hostnode.virtual_machines) {
        activeVMsFields = hostnode.virtual_machines.map((vm) => ({
          name: `VM ID: ${vm.id}`,
          value: `Used Storage: ${vm.used_storage} GB, Used GPUs: ${vm.used_gpus}, Used CPUs: ${vm.used_cpus}, Used RAM: ${vm.used_ram} GB, Revenue Storage: ${vm.revenue_storage}, Revenue Compute: ${vm.revenue_compute}`
        }));
      } else {
        activeVMsFields = [{ name: 'No active VMs found', value: 'No active VMs found' }];
      }
      
      const activeVMsEmbed = {
        title: activeVMsTitle,
        description: activeVMsDescription,
        fields: activeVMsFields
      };

      // Send embeds
      try {
        //const channel = `${hostnodeChannels[hostnode.hostnode_id]}`;
        //const channel = guild.channels.cache.find(channel => `${channel.name}` === hostnode.hostnode_id);
        for (const [channelId, channel] of Object.entries(hostnodeChannels)) {

           console.log('**---');
           console.log(hostnode.hostnode_id);
           console.log(hostnode.hostnode_id);
           console.log(channelId);
           //console.log(`${channelId}`);
           console.log('**---');
          
          if (`${channelId}` === hostnode.hostnode_id) {
            console.log("if channel");
            console.log(channel);
            //const realchannel = guild.channels.cache.get(channelId);
            channel.send({ embeds: [hardwareEmbed, revenueEmbed, ...activeVMsEmbeds] });
          }
        }
      } catch (error) {
        console.error(error);
      }
      
    }); 
    
    
  } catch (error) {
    console.error(error);
  }
}

function getThisMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${padZero(month)}`;
}

function padZero(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

cron.schedule('*/5 * * * *', updateMessages);

