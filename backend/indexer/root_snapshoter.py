def snapshot_if_changed(new_root):
    last = get_last_snapshot()
    if last is None or last.root != new_root:
        tx_hash = anchor_merkle_root(new_root)
        save_snapshot(new_root, tx_hash)
