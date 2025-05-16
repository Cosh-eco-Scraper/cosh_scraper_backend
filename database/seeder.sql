-- First, add description column to stores table
ALTER TABLE stores
    ADD COLUMN description TEXT;

-- Insert locations (Belgian fashion retail locations)
INSERT INTO locations (street, number, postal_code, city, country)
VALUES ('Avenue Louise', '71A', '1050', 'Brussels', 'Belgium'),
       ('Meir', '67', '2000', 'Antwerp', 'Belgium'),
       ('Veldstraat', '23', '9000', 'Ghent', 'Belgium'),
       ('Rue de l''Ange', '45', '5000', 'Namur', 'Belgium'),
       ('Galerie Saint-Lambert', '27', '4000', 'Liège', 'Belgium');

-- Insert stores (Belgian fashion retailers) with descriptions
INSERT INTO stores (name, location_id, description)
VALUES ('JBC Fashion Center', 1,
        'A family-owned Belgian fashion retailer focusing on sustainable casual wear for all ages. Known for their commitment to ethical manufacturing and affordable eco-friendly clothing options.'),
       ('Mayerline Boutique', 2,
        'Premium Belgian women''s fashion house established in 1925, specializing in elegant office wear and occasion clothing with a strong focus on sustainable textile sourcing.'),
       ('CKS Store', 3,
        'Contemporary fashion brand offering trendy collections for urban professionals. Emphasizes smart casual wear with growing commitment to environmental responsibility.'),
       ('Xandres Premium', 4,
        'High-end Belgian fashion label known for timeless women''s wear. Combines luxury with sustainability, offering premium quality garments made from eco-conscious materials.'),
       ('Terre Bleue', 5,
        'Modern Belgian lifestyle brand creating sophisticated collections with respect for people and planet. Features both casual and formal wear with sustainable manufacturing practices.');

-- Insert brands (fashion brands with sustainability ratings)
-- Labels: 
-- A = Excellent sustainability practices (100% sustainable materials, carbon neutral)
-- B = Good sustainability practices (>70% sustainable materials)
-- C = Fair sustainability practices (>40% sustainable materials)
-- D = Basic sustainability practices (<40% sustainable materials)
INSERT INTO brands (name, label)
VALUES ('Essentiel Antwerp', 'A'), -- Uses 100% organic materials, carbon neutral production
       ('Sarah Pacini', 'A'),      -- Fully sustainable supply chain and materials
       ('Talking French', 'B'),    -- 80% sustainable materials
       ('Mer du Nord', 'C'),       -- Working towards sustainability, currently at 50%
       ('42/54', 'D');
-- Beginning their sustainability journey

-- Insert store-brand relationships
INSERT INTO store_brands (store_id, brand_id)
VALUES (1, 1), -- JBC - Essentiel Antwerp (A)
       (1, 2), -- JBC - Sarah Pacini (A)
       (1, 3), -- JBC - Talking French (B)
       (2, 1), -- Mayerline - Essentiel Antwerp (A)
       (2, 4), -- Mayerline - Mer du Nord (C)
       (3, 2), -- CKS - Sarah Pacini (A)
       (3, 3), -- CKS - Talking French (B)
       (4, 1), -- Xandres - Essentiel Antwerp (A)
       (4, 5), -- Xandres - 42/54 (D)
       (5, 2), -- Terre Bleue - Sarah Pacini (A)
       (5, 3), -- Terre Bleue - Talking French (B)
       (5, 4); -- Terre Bleue - Mer du Nord (C)