CREATE INDEX ix_episode_stars_user_created_node
ON episode_stars (user_id, created_at DESC, node_id);
