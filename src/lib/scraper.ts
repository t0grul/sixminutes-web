import * as cheerio from 'cheerio'

export interface ScrapedLesson {
  url: string
  title: string
  date: string
  imageUrl: string
  intro: string
  audioUrl: string
  transcript: string
  vocab: Array<{ term: string; definition: string }>
}

export async function scrapeLesson(url: string): Promise<ScrapedLesson | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch page')
    
    const html = await response.text()
    const $ = cheerio.load(html)

    // Title - look for the episode title heading
    let title = "Unknown Title"
    
    // Method 1: Find h3 with class widget-heading that contains the question/title
    $('div.widget-heading h3').each((_, el) => {
      const text = $(el).text().trim()
      const skipHeadings = ['6 Minute English', 'Intermediate level', 'Introduction', 
                           'Vocabulary', 'TRANSCRIPT', "This week's question", 'Next']
      if (text && !skipHeadings.includes(text)) {
        if (text.includes('?') || text.length > 10) {
          title = text
          return false // break
        }
      }
    })
    
    // Method 2: Try og:title meta tag
    if (title === "Unknown Title") {
      const metaTitle = $('meta[property="og:title"]').attr('content')
      if (metaTitle && metaTitle !== "Learning English") {
        title = metaTitle
      }
    }

    // Date - extract from the episode info
    let date = ""
    const dateElem = $('div.widget-bbcle-featuresubheader .details h3').text()
    const dateMatch = dateElem.match(/\/\s*(\d{1,2}\s+\w+\s+\d{4})/)
    if (dateMatch) {
      date = dateMatch[1].trim()
    }

    // Image URL - get the episode thumbnail
    let imageUrl = ""
    const videoImg = $('div.widget-video img').attr('src')
    if (videoImg) {
      imageUrl = videoImg
    } else {
      const ogImage = $('meta[property="og:image"]').attr('content')
      if (ogImage) imageUrl = ogImage
    }

    // Intro - find Introduction section
    let intro = ""
    const introHeader = $('h3').filter((_, el) => /Introduction/i.test($(el).text()))
    if (introHeader.length) {
      const nextP = introHeader.first().next('p')
      if (nextP.length) {
        intro = nextP.text().trim()
      }
    }

    // Audio URL
    let audioUrl = ""
    const downloadLink = $('a.download.bbcle-download-extension-mp3').attr('href')
    if (downloadLink) {
      audioUrl = downloadLink
    }

    // Vocabulary - parse the vocabulary section
    const vocabList: Array<{ term: string; definition: string }> = []
    
    const vocabHeader = $('h3').filter((_, el) => /^Vocabulary$/i.test($(el).text().trim()))
    
    if (vocabHeader.length) {
      // Get the paragraph right after the Vocabulary header
      const vocabP = vocabHeader.first().next('p')
      
      if (vocabP.length) {
        const nodes = vocabP.contents().toArray()
        let currentTerm = ''
        let currentDefinition = ''
        
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          const nodeName = (node as unknown as { name: string }).name
          
          if (node.type === 'tag' && nodeName === 'strong') {
            // If we have a previous term, save it
            if (currentTerm && currentDefinition) {
              vocabList.push({ term: currentTerm, definition: currentDefinition.trim() })
            }
            
            // Start new term
            currentTerm = $(node).text().trim()
            currentDefinition = ''
            
            // Skip terms that are section headers
            const skipTerms = ['TRANSCRIPT', 'INTRODUCTION', 'VOCABULARY', 'NEXT', 'Note:']
            if (skipTerms.some(s => currentTerm.toUpperCase().includes(s))) {
              currentTerm = ''
            }
          } else if (node.type === 'tag' && nodeName === 'br') {
            // <br> separates term from definition, or ends definition
            // If we have a term but no definition yet, next text will be definition
            // If we have both, the next <strong> will trigger save
            continue
          } else if (node.type === 'text') {
            const text = (node as unknown as { data: string }).data || ''
            const cleanText = text.replace(/\u00a0/g, ' ').trim()
            
            // If we have a current term and this is non-empty text, it's the definition
            if (currentTerm && cleanText) {
              currentDefinition = cleanText
            }
          }
        }
        
        // Don't forget the last term
        if (currentTerm && currentDefinition) {
          vocabList.push({ term: currentTerm, definition: currentDefinition.trim() })
        }
      }
    }

    // Transcript - find TRANSCRIPT section and extract content
    let transcript = ""
    const transcriptHeader = $('strong').filter((_, el) => /TRANSCRIPT/i.test($(el).text()))
    
    if (transcriptHeader.length) {
      const parentP = transcriptHeader.first().parent('p')
      if (parentP.length) {
        let current = parentP.next()
        while (current.length) {
          const text = current.text().trim()
          if (current.is('h3') || text.startsWith('Next')) break
          if (current.is('p')) {
            // Skip the "Note: This is not a word-for-word transcript" line
            if (text.includes('Note:') && text.includes('word-for-word')) {
              current = current.next()
              continue
            }
            
            let pText = ''
            const nodes = current.contents().toArray()
            
            // Process each node
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i]
              const nodeName = (node as unknown as { name: string }).name
              
              if (node.type === 'tag' && nodeName === 'strong') {
                const strongText = $(node).text().trim()
                
                // Skip empty strong tags
                if (!strongText) {
                  continue
                }
                
                // Check if this strong tag is followed by a <br> tag (speaker name pattern)
                // Speaker names are: <strong>Name</strong><br>
                const nextNode = nodes[i + 1]
                const nextNextNode = nodes[i + 2]
                
                // Check if next sibling is <br> or next is &nbsp; followed by <br>
                const isFollowedByBr = nextNode && (
                  (nextNode.type === 'tag' && (nextNode as unknown as { name: string }).name === 'br') ||
                  (nextNode.type === 'text' && (nextNode as unknown as { data: string }).data?.trim() === '' && 
                   nextNextNode && nextNextNode.type === 'tag' && (nextNextNode as unknown as { name: string }).name === 'br')
                )
                
                if (isFollowedByBr && strongText.length < 30 && !strongText.includes('–')) {
                  // This is a speaker name
                  if (pText && !pText.endsWith('\n')) {
                    pText += '\n'
                  }
                  pText += `[SPEAKER]${strongText}[/SPEAKER]\n`
                } else {
                  // This is vocabulary or emphasis - keep as bold inline text
                  // Add space before if needed (no space or newline before)
                  if (pText && !pText.endsWith(' ') && !pText.endsWith('\n')) {
                    pText += ' '
                  }
                  pText += `**${strongText}**`
                  // Add space after if next node is text that doesn't start with space or punctuation
                  if (nextNode && nextNode.type === 'text') {
                    const nextText = (nextNode as unknown as { data: string }).data || ''
                    if (nextText && !nextText.match(/^[\s.,;:!?'"\-–—)/]/)) {
                      pText += ' '
                    }
                  }
                }
              } else if (node.type === 'tag' && nodeName === 'br') {
                pText += '\n'
              } else if (node.type === 'text') {
                let nodeText = (node as unknown as { data: string }).data || ''
                // Clean up &nbsp; entities
                nodeText = nodeText.replace(/\u00a0/g, ' ')
                pText += nodeText
              }
            }
            
            transcript += pText + '\n\n'
          }
          current = current.next()
        }
      }
    }
    
    // Clean up transcript - remove excessive newlines and whitespace
    transcript = transcript
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+/gm, '')
      .trim()

    return {
      url,
      title,
      date,
      imageUrl,
      intro,
      audioUrl,
      transcript,
      vocab: vocabList
    }

  } catch (error) {
    console.error('Error scraping lesson:', error)
    return null
  }
}
