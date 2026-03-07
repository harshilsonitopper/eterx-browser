const fs = require('fs');
const sidebarPath = 'c:/Harshil projects/eterx-browser/components/SmartSidebar.tsx';
let sidebar = fs.readFileSync(sidebarPath, 'utf8');

// I notice line 1409 has `)}` and then 1410 has `</>` which means the parent fragment or div is unbalanced.
// Back in step 1580, I added an inner <div onClick={handleTimestampClick}> wrapper around MarkdownRenderer:
// sidebar = sidebar.replace('<MarkdownRenderer content={turn.text} /></div>', '<MarkdownRenderer content={turn.text} /></div></div>');
// This was likely the wrong replacement and added an extra </div> or misplaced it.

if (sidebar.includes('<div onClick={handleTimestampClick} style={{cursor: "default"}}><MarkdownRenderer content={turn.text} /></div></div>')) {
    sidebar = sidebar.replace(
        '<div onClick={handleTimestampClick} style={{cursor: "default"}}><MarkdownRenderer content={turn.text} /></div></div>',
        '<div onClick={handleTimestampClick} style={{cursor: "default"}}><MarkdownRenderer content={turn.text} /></div>'
    );
    console.log('Fixed extra div closure');
} else {
    // Look closely at the error: components/SmartSidebar.tsx(1410,39): error TS1003: Identifier expected.
    console.log('Replacing the specific block around MarkdownRenderer');
    
    // The issue is likely how `turn.text` is rendered in normal vs thinking state.
    // Let's just fix the whole markdown render block
    
    // There are TS errors about `)` expected.
    // Let's find exactly where the onClick handler was inserted.
    const searchStr = '<div onClick={handleTimestampClick} style={{cursor: "default"}}><MarkdownRenderer content={turn.text}';
    if (sidebar.includes(searchStr)) {
        console.log('Found the inserted div');
        // We will just remove the onClick wrapper temporarily to see if it fixes the build
        sidebar = sidebar.replace(
            /<div onClick=\{handleTimestampClick\} style=\{\{cursor: "default"\}\}><MarkdownRenderer content=\{turn\.text\}(.*?)<\/div>/g, 
            '<MarkdownRenderer content={turn.text}$1'
        );
        console.log('Removed broken div wrappers around MarkdownRenderer');
    }
}

// But wait, the previous code also replaced `turn.text` entirely if the text was raw string.
// Let's just restore the file up to line 1450 from a clean state or use regex to fix it.
// The error shows up at turn.status === 'stopped' part.

fs.writeFileSync(sidebarPath, sidebar, 'utf8');
