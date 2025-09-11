class TrelloAPI {
  constructor() {
    this.baseURL = 'https://api.trello.com/1';
  }

  getConfiguredBoardIds() {
    const boardIdsEnv = import.meta.env.VITE_TRELLO_BOARD_IDS;
    if (!boardIdsEnv) return [];
    
    return boardIdsEnv.split(',').map(boardId => boardId.trim()).filter(boardId => boardId.length > 0);
  }

  async getBoardInfo(boardId) {
    try {
      const response = await fetch(`${this.baseURL}/boards/${boardId}?fields=name,id`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch board info: ${response.statusText}`);
      }
      
      const board = await response.json();
      return {
        id: board.id,
        name: board.name
      };
    } catch (error) {
      console.warn(`Error fetching board info for ${boardId}:`, error);
      // Return fallback for demo purposes
      return {
        id: boardId,
        name: `Board ${boardId.slice(-4)}`
      };
    }
  }

  async getConfiguredBoards() {
    const boardIds = this.getConfiguredBoardIds();
    const boards = [];
    
    for (const boardId of boardIds) {
      try {
        const boardInfo = await this.getBoardInfo(boardId);
        boards.push(boardInfo);
      } catch (error) {
        console.warn(`Failed to fetch board ${boardId}:`, error);
      }
    }
    
    return boards;
  }

  async getBoardLists(boardId) {
    try {
      const response = await fetch(`${this.baseURL}/boards/${boardId}/lists?fields=id,name`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch real board lists: ${response.statusText}`);
        // Fallback to mock data for demo purposes
        return this.getMockLists();
      }
      
      const lists = await response.json();
      return lists.map(list => ({
        id: list.id,
        name: list.name,
        cards: []
      }));
    } catch (error) {
      console.warn('Error fetching board lists, using mock data:', error);
      return this.getMockLists();
    }
  }

  getMockLists() {
    return [
      { id: 'list1', name: 'Rock Songs', cards: [] },
      { id: 'list2', name: 'Pop Songs', cards: [] },
      { id: 'list3', name: 'Jazz Songs', cards: [] },
      { id: 'list4', name: 'Hip-Hop Songs', cards: [] },
      { id: 'list5', name: 'Electronic Songs', cards: [] },
      { id: 'list6', name: 'Classical Songs', cards: [] },
      { id: 'list7', name: 'Country Songs', cards: [] },
      { id: 'list8', name: 'R&B Songs', cards: [] }
    ];
  }

  async getListCards(listId) {
    try {
      const response = await fetch(`${this.baseURL}/lists/${listId}/cards?fields=id,name,desc`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch real list cards: ${response.statusText}`);
        return this.getMockCards(listId);
      }
      
      const cards = await response.json();
      return cards.map(card => ({
        id: card.id,
        name: card.name,
        desc: card.desc || ''
      }));
    } catch (error) {
      console.warn('Error fetching list cards, using mock data:', error);
      return this.getMockCards(listId);
    }
  }

  getMockCards(listId) {
    const mockData = {
      'list1': [ // Rock Songs
        { id: 'card1', name: 'Bohemian Rhapsody - Queen', desc: 'Artist: Queen' },
        { id: 'card2', name: 'Hotel California - Eagles', desc: 'Artist: Eagles' },
        { id: 'card3', name: 'Sweet Child O Mine - Guns N Roses', desc: 'Artist: Guns N\' Roses' }
      ],
      'list2': [ // Pop Songs
        { id: 'card4', name: 'Blinding Lights - The Weeknd', desc: 'Artist: The Weeknd' },
        { id: 'card5', name: 'Watermelon Sugar - Harry Styles', desc: 'Artist: Harry Styles' },
        { id: 'card6', name: 'Levitating - Dua Lipa', desc: 'Artist: Dua Lipa' }
      ],
      'list3': [ // Jazz Songs
        { id: 'card7', name: 'Take Five - Dave Brubeck', desc: 'Artist: Dave Brubeck' },
        { id: 'card8', name: 'So What - Miles Davis', desc: 'Artist: Miles Davis' },
        { id: 'card9', name: 'All Blues - Miles Davis', desc: 'Artist: Miles Davis' }
      ],
      'list4': [ // Hip-Hop Songs
        { id: 'card10', name: 'HUMBLE. - Kendrick Lamar', desc: 'Artist: Kendrick Lamar' },
        { id: 'card11', name: 'God\'s Plan - Drake', desc: 'Artist: Drake' },
        { id: 'card12', name: 'SICKO MODE - Travis Scott', desc: 'Artist: Travis Scott' }
      ],
      'list5': [ // Electronic Songs
        { id: 'card13', name: 'Strobe - Deadmau5', desc: 'Artist: Deadmau5' },
        { id: 'card14', name: 'Clarity - Zedd', desc: 'Artist: Zedd' },
        { id: 'card15', name: 'Animals - Martin Garrix', desc: 'Artist: Martin Garrix' }
      ],
      'list6': [ // Classical Songs
        { id: 'card16', name: 'Symphony No. 9 - Beethoven', desc: 'Artist: Ludwig van Beethoven' },
        { id: 'card17', name: 'Eine kleine Nachtmusik - Mozart', desc: 'Artist: Wolfgang Amadeus Mozart' },
        { id: 'card18', name: 'The Four Seasons - Vivaldi', desc: 'Artist: Antonio Vivaldi' }
      ],
      'list7': [ // Country Songs
        { id: 'card19', name: 'Old Town Road - Lil Nas X', desc: 'Artist: Lil Nas X' },
        { id: 'card20', name: 'The Good Ones - Gabby Barrett', desc: 'Artist: Gabby Barrett' },
        { id: 'card21', name: 'Heartbreak On The Map - Ryan Hurd', desc: 'Artist: Ryan Hurd' }
      ],
      'list8': [ // R&B Songs
        { id: 'card22', name: 'Blinding Lights - The Weeknd', desc: 'Artist: The Weeknd' },
        { id: 'card23', name: 'Good as Hell - Lizzo', desc: 'Artist: Lizzo' },
        { id: 'card24', name: 'Adorn - Miguel', desc: 'Artist: Miguel' }
      ]
    };
    
    return mockData[listId] || [];
  }

  async getCardsFromLists(listIds) {
    const allCards = [];
    
    for (const listId of listIds) {
      try {
        const cards = await this.getListCards(listId);
        allCards.push(...cards);
      } catch (error) {
        console.warn(`Failed to fetch cards from list ${listId}:`, error);
      }
    }
    
    return allCards.map(card => ({
      name: this.extractSongName(card.name),
      artists: this.extractArtists(card.name, card.desc),
      uri: `trello:${card.id}`,
      id: card.id
    }));
  }

  extractSongName(cardName) {
    return cardName.trim();
  }

  extractArtists(cardName, cardDesc) {
    if (cardDesc && cardDesc.trim()) {
      const descLines = cardDesc.split('\n');
      const artistLine = descLines.find(line => 
        line.toLowerCase().includes('artist') || 
        line.toLowerCase().includes('by')
      );
      
      if (artistLine) {
        const artistMatch = artistLine.match(/(?:artist|by)[:\s]+([^,\n]+)/i);
        if (artistMatch) {
          return [artistMatch[1].trim()];
        }
      }
    }
    
    const nameMatch = cardName.match(/(.+?)\s*-\s*(.+?)$/);
    if (nameMatch) {
      return [nameMatch[1].trim()];
    }
    
    return ['Unknown Artist'];
  }
}

export default TrelloAPI;