export class TreeNode {
  key: any;
  value: any;
  parent: TreeNode | null;
  children: TreeNode[];

  constructor(key: any, value = key, parent = null) {
    this.key = key;
    this.value = value;
    this.parent = parent;
    this.children = [];
  }

  get isLeaf() {
    return this.children.length === 0;
  }

  get hasChildren() {
    return !this.isLeaf;
  }
}

export class Tree {
  public root: TreeNode

  constructor(key: any, value = key) {
    this.root = new TreeNode(key, value);
  }

  *preOrderTraversal(node = this.root): any {
    yield node;
    if (node.children.length) {
      for (const child of node.children) {
        yield* this.preOrderTraversal(child);
      }
    }
  }

  *postOrderTraversal(node = this.root): any {
    if (node.children.length) {
      for (const child of node.children) {
        yield* this.postOrderTraversal(child);
      }
    }
    yield node;
  }

  insert(parentNodeKey: any, key: any, value = key) {
    for (const node of this.preOrderTraversal()) {
      if (node.key === parentNodeKey) {
        const newNode = new TreeNode(key, value, node)
        node.children.push(newNode);
        return newNode;
      }
    }
    return null;
  }

  remove(key: any) {
    for (const node of this.preOrderTraversal()) {
      const filtered = node.children.filter((c: TreeNode) => c.key !== key);
      if (filtered.length !== node.children.length) {
        node.children = filtered;
        return true;
      }
    }
    return false;
  }

  find(key: any) {
    for (const node of this.preOrderTraversal()) {
      if (node.key === key) return node;
    }
    return undefined;
  }
}
