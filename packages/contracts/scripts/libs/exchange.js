const EXCHANGES = {
  mainnet: [
    {
      name: 'JediSwap',
      contract_address: '0x041fd22b238fa21cfcf5dd45a8548974d8263b3a531a60388411c5e230f97023',
    },
  ],
  goerli: [
    {
      name: 'JediSwap',
      contract_address: '0x02bcc885342ebbcbcd170ae6cafa8a4bed22bb993479f49806e72d96af94c965',
    },
  ],
  sepolia: [
    {
      name: 'JediSwap',
      contract_address: '',
    },
  ],
}

export const getExchanges = (network) => {
  if (!EXCHANGES[network.toLowerCase()]) {
    throw new Error(`Network ${network} not found`)
  }
  return EXCHANGES[network.toLowerCase()]
}
