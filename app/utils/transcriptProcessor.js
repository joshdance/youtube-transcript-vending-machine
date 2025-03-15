// Class to represent a single subtitle unit
class Subtitle {
    constructor(startMs, endMs, text) {
        this.start = startMs; // Start time in milliseconds
        this.end = endMs;     // End time in milliseconds
        this.text = text.trim();
    }

    // Convert milliseconds to SRT time format (hh:mm:ss,ms)
    static formatDuration(ms) {
        const hours = Math.floor(ms / 3600000);
        ms %= 3600000;
        const minutes = Math.floor(ms / 60000);
        ms %= 60000;
        const seconds = Math.floor(ms / 1000);
        const milliseconds = ms % 1000;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    }

    toString() {
        return `${Subtitle.formatDuration(this.start)} --> ${Subtitle.formatDuration(this.end)}\n${this.text}\n\n`;
    }
}

// Class to parse and manage SRT subtitles
class SimpleSrt {
    constructor(srtString) {
        this.subs = this.parseSrt(srtString);
    }

    // Parse timecode (e.g., "00:00:01,500") to milliseconds
    static parseTimecode(timeStr) {
        const [time, ms] = timeStr.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + Number(ms);
    }

    // Parse SRT string into Subtitle objects
    parseSrt(srtString) {
        const lines = srtString.split('\n').filter(line => line.trim().length > 0).concat('', '');
        const subtitles = [];
        let i = 0;

        while (i < lines.length) {
            const timecodeMatch = lines[i].match(/(\d+:\d+:\d+,\d+) --> (\d+:\d+:\d+,\d+)/);
            if (timecodeMatch) {
                const start = SimpleSrt.parseTimecode(timecodeMatch[1]);
                const end = SimpleSrt.parseTimecode(timecodeMatch[2]);
                let text = '';
                let y = 1;
                while (i + y < lines.length && !lines[i + y].match(/(\d+:\d+:\d+,\d+) --> (\d+:\d+:\d+,\d+)/)) {
                    text += (text ? '\n' : '') + lines[i + y];
                    y++;
                }
                subtitles.push(new Subtitle(start, end, text));
                i += y;
            } else {
                i++;
            }
        }
        return subtitles;
    }
}

// Function to deduplicate and clean up subtitles
function dedupeYtSrt(subs) {
    let previousSubtitle = null;
    const result = [];

    for (const subtitle of subs) {
        if (!previousSubtitle) {
            previousSubtitle = subtitle;
            continue;
        }

        // Create a copy to avoid modifying the original
        const currentSub = {
            start: subtitle.start,
            end: subtitle.end, 
            text: subtitle.text.trim()
        };
        
        if (currentSub.text.length === 0) continue;

        // Very short subtitle with same text as previous
        if (currentSub.end - currentSub.start < 150 && previousSubtitle.text.includes(currentSub.text)) {
            previousSubtitle.end = currentSub.end;
            continue;
        }

        const currentLines = currentSub.text.split('\n');
        const lastLines = previousSubtitle.text.split('\n');
        let singleWord = false;

        // Handle duplicate first line
        if (currentLines.length > 0 && lastLines.length > 0 && 
            currentLines[0] === lastLines[lastLines.length - 1]) {
            if (lastLines.length === 1 && lastLines[0].split(' ').length < 2 && lastLines[0].length > 2) {
                singleWord = true;
                currentSub.text = `${currentLines[0]} ${currentLines.slice(1).join('\n')}`.trim();
            } else {
                currentSub.text = currentLines.slice(1).join('\n');
            }
        } else {
            // Merge single-word subtitles into previous
            if (currentSub.text.split(' ').length <= 2) {
                previousSubtitle.end = currentSub.end;
                const titleText = currentSub.text[0] !== ' ' ? ` ${currentSub.text}` : currentSub.text;
                previousSubtitle.text += titleText;
                continue;
            }
        }

        // Fix overlap with 1ms gap
        if (currentSub.start <= previousSubtitle.end) {
            previousSubtitle.end = currentSub.start - 1;
        }

        // Swap start/end if in wrong order
        if (currentSub.start >= currentSub.end) {
            [currentSub.start, currentSub.end] = [currentSub.end, currentSub.start];
        }

        if (!singleWord) {
            result.push(previousSubtitle);
        }
        previousSubtitle = currentSub;
    }

    if (previousSubtitle) result.push(previousSubtitle);
    return result;
}

// Convert subtitles back to SRT text
function subsToText(subs) {
    return subs.map((subtitle, index) => `${index + 1}\n${subtitle.toString()}`).join('').trim();
}

// Main function to process SRT text
function processSrt(srtText) {
    const srt = new SimpleSrt(srtText);
    const cleanedSubs = dedupeYtSrt(srt.subs);
    return subsToText(cleanedSubs);
}

// Adapter function to process transcript array used by the app
function deduplicateTranscript(transcript) {
    if (!Array.isArray(transcript)) return transcript;
    
    // Debug log
    console.log('Processing transcript for deduplication:', transcript.length, 'entries');
    
    // Convert transcript array to SRT format for processing
    let srtText = '';
    transcript.forEach((cue, index) => {
        // Convert time format from "00:00:01.500" to "00:00:01,500" for SRT processing
        // Replace the last occurrence of a period with a comma
        const startTime = cue.startTime.replace(/\.([^.]*)$/, ',$1');
        const endTime = cue.endTime.replace(/\.([^.]*)$/, ',$1');
        srtText += `${index + 1}\n${startTime} --> ${endTime}\n${cue.text}\n\n`;
    });
    
    // Debug the SRT format
    console.log('SRT text sample:', srtText.substring(0, 300) + '...');
    
    try {
        // Process the SRT text
        const processedSrt = processSrt(srtText);
        console.log('Processed SRT sample:', processedSrt.substring(0, 300) + '...');
        
        // Convert back to transcript array format
        const lines = processedSrt.split('\n');
        const result = [];
        let i = 0;
        
        while (i < lines.length) {
            // Skip empty lines and index lines
            if (lines[i].trim() === '' || !isNaN(parseInt(lines[i]))) {
                i++;
                continue;
            }
            
            const timecodeMatch = lines[i].match(/(\d+:\d+:\d+,\d+) --> (\d+:\d+:\d+,\d+)/);
            if (timecodeMatch) {
                // Convert back from SRT format to app format
                const startTime = timecodeMatch[1].replace(/,([^,]*)$/, '.$1');
                const endTime = timecodeMatch[2].replace(/,([^,]*)$/, '.$1');
                let text = '';
                i++;
                
                while (i < lines.length && !lines[i].match(/(\d+:\d+:\d+,\d+) --> (\d+:\d+:\d+,\d+)/) && lines[i].trim() !== '' && !lines[i].match(/^\d+$/)) {
                    text += (text ? '\n' : '') + lines[i];
                    i++;
                }
                
                if (text.trim() !== '') {
                    result.push({
                        startTime,
                        endTime,
                        text
                    });
                }
            } else {
                i++;
            }
        }
        
        console.log('Result entries:', result.length);
        return result.length > 0 ? result : transcript; // Fallback to original transcript if processing resulted in empty array
    } catch (error) {
        console.error('Error during transcript processing:', error);
        return transcript; // Return original transcript on error
    }
}

export { deduplicateTranscript }; 