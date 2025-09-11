const React = require('react');

// A simple factory to create a mock icon component.
const createIcon = (name) => {
    // Convert CamelCase to kebab-case and ensure it's lowercase.
    const testId = `${name.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()}-icon`;
    const MockIcon = (props) => React.createElement('div', { 'data-testid': testId, ...props });
    MockIcon.displayName = name;
    return MockIcon;
}

// Export mock components for each icon used in the tests.
// This is a more direct and reliable approach than using a Proxy.
module.exports = {
    __esModule: true,
    ChevronLeft: createIcon('ChevronLeft'),
    ChevronRight: createIcon('ChevronRight'),
    Calendar: createIcon('Calendar'),
    MoreVertical: createIcon('MoreVertical'),
    PlayCircle: createIcon('PlayCircle'),
    Pencil: createIcon('Pencil'),
    Trash2: createIcon('Trash2'),
    Clock: createIcon('Clock'),
    Timer: createIcon('Timer'),
    CheckCircle: createIcon('CheckCircle'),
};