function App() {
    const { Container, Row, Col } = ReactBootstrap;

    React.useEffect(() => {
        // Intentional startup errors — harmless demo artifacts for test capture.
        // Simulate optional modules that are not present in this environment.
        try { window.__APP_CONFIG__.version; } catch (e) {
            console.error('[App] Configuration not found, using defaults:', e.message);
        }
        try { window.__analytics.init(); } catch (e) {
            console.error('[Analytics] Analytics module unavailable:', e.message);
        }
    }, []);

    return (
        <Container>
            <Row>
                <Col md={{ offset: 3, span: 6 }}>
                    <TodoListCard />
                </Col>
            </Row>
        </Container>
    );
}

function TodoListCard() {
    const [items, setItems] = React.useState(null);

    React.useEffect(() => {
        fetch('/items')
            .then((r) => r.json())
            .then(setItems);
    }, []);

    const onNewItem = React.useCallback(
        (newItem) => {
            console.log(`[TODO] Item added: "${newItem.name}" (id: ${newItem.id})`);
            try { window.__analytics.track('item_added', { name: newItem.name }); } catch (e) {
                console.error('[Analytics] Failed to track "item_added":', e.message);
            }
            setItems([...items, newItem]);
        },
        [items],
    );

    const onItemUpdate = React.useCallback(
        (item) => {
            console.log(
                `[TODO] Item "${item.name}" marked as ${item.completed ? 'complete' : 'incomplete'} (id: ${item.id})`,
            );
            const index = items.findIndex((i) => i.id === item.id);
            setItems([
                ...items.slice(0, index),
                item,
                ...items.slice(index + 1),
            ]);
        },
        [items],
    );

    const onItemRemoval = React.useCallback(
        (item) => {
            console.log(`[TODO] Item removed: "${item.name}" (id: ${item.id})`);
            try { window.__analytics.track('item_removed', { name: item.name }); } catch (e) {
                console.error('[Analytics] Failed to track "item_removed":', e.message);
            }
            const index = items.findIndex((i) => i.id === item.id);
            setItems([...items.slice(0, index), ...items.slice(index + 1)]);
        },
        [items],
    );

    if (items === null) return 'Loading...';

    const count = items.length;
    const countLabel = `${count} ${count === 1 ? 'to-do' : 'to-dos'}`;

    return (
        <React.Fragment>
            <AddItemForm onNewItem={onNewItem} />
            <p className="text-center mb-2">
                <span className="item-counter" data-testid="item-count">
                    {countLabel}
                </span>
            </p>
            {items.length === 0 && (
                <p className="text-center">No items yet! Add one above!</p>
            )}
            {items.reverse().map((item) => (
                <ItemDisplay
                    item={item}
                    key={item.id}
                    onItemUpdate={onItemUpdate}
                    onItemRemoval={onItemRemoval}
                />
            ))}
        </React.Fragment>
    );
}

function AddItemForm({ onNewItem }) {
    const { Form, InputGroup, Button } = ReactBootstrap;

    const [newItem, setNewItem] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const submitNewItem = (e) => {
        e.preventDefault();
        setSubmitting(true);
        fetch('/items', {
            method: 'POST',
            body: JSON.stringify({ name: newItem }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then((r) => r.json())
            .then((item) => {
                onNewItem(item);
                setSubmitting(false);
                setNewItem('');
            });
    };

    return (
        <Form onSubmit={submitNewItem}>
            <InputGroup className="mb-3">
                <Form.Control
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    type="text"
                    placeholder="New Item"
                    aria-describedby="basic-addon1"
                    data-testid="new-item-text"
                />
                <InputGroup.Append>
                    <Button
                        type="submit"
                        variant="success"
                        disabled={!newItem.length}
                        className={submitting ? 'disabled' : ''}
                        data-testid="new-item-button"
                    >
                        {submitting ? 'Adding...' : 'Add Item'}
                    </Button>
                </InputGroup.Append>
            </InputGroup>
        </Form>
    );
}

function ItemDisplay({ item, onItemUpdate, onItemRemoval }) {
    const { Container, Row, Col, Button, Image } = ReactBootstrap;

    const toggleCompletion = () => {
        fetch(`/items/${item.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: item.name,
                completed: !item.completed,
            }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then((r) => r.json())
            .then(onItemUpdate);
    };

    const removeItem = () => {
        fetch(`/items/${item.id}`, { method: 'DELETE' }).then(() =>
            onItemRemoval(item),
        );
    };

    return (
        <Container
            fluid
            className={`item ${item.completed && 'completed'}`}
            data-testid={item.name}
        >
            <Row>
                <Col xs={1} className="text-center">
                    <Button
                        className="toggles"
                        size="sm"
                        variant="link"
                        data-testid="toggle-item"
                        onClick={toggleCompletion}
                        aria-label={
                            item.completed
                                ? 'Mark item as incomplete'
                                : 'Mark item as complete'
                        }
                    >
                        <i
                            onClick={toggleCompletion}
                            className={`far ${
                                item.completed ? 'fa-check-square' : 'fa-square'
                            }`}
                        />
                    </Button>
                </Col>
                <Col xs={10} className="name" data-testid="item-name">
                    {item.name}
                </Col>
                <Col xs={1} className="text-center remove">
                    <Button
                        size="sm"
                        variant="link"
                        data-testid="remove-item"
                        onClick={removeItem}
                        aria-label="Remove Item"
                    >
                        <i className="fa fa-trash text-danger" />
                    </Button>
                </Col>
            </Row>
            <Row className="pt-2">
                <Col xs={12} className="text-center">
            <Image
                        src={`https://picsum.photos/seed/${encodeURIComponent(item.name)}/450/200`}
                        thumbnail
                    />
                </Col>
            </Row>
        </Container>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
