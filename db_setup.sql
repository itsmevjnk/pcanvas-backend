-- NOTE: RUN THIS WITHIN THE TARGET DATABASE!

DROP TABLE IF EXISTS pc_canvas_list;

DROP TABLE IF EXISTS pc_canvas_2023_09; -- for example, we'll set up a canvas for September 2023
DROP TABLE IF EXISTS pc_auth;

CREATE TABLE pc_auth (
    user_id             INT             NOT NULL    AUTO_INCREMENT,
    user_name			VARCHAR(50)		NOT NULL	UNIQUE,
    email               VARCHAR(150)    NOT NULL	UNIQUE,
    pswd_hash           VARCHAR(64)     NOT NULL,
    moderator           BOOLEAN         NOT NULL    DEFAULT         (FALSE),
    c_date				TIMESTAMP		NOT NULL	DEFAULT			(CURRENT_TIMESTAMP),

    PRIMARY KEY         (user_id)
);
INSERT INTO pc_auth (user_name, email, pswd_hash, moderator) VALUES ('root', 'webadmin@example.com', 'fd74bdd901857b89f5737e5352a2a8a2d1f000aa4bed4aee47c95afaa37d0f99', TRUE); -- root, password is P@55w0rd

CREATE TABLE pc_canvas_list (
    canvas_id           INT             NOT NULL    AUTO_INCREMENT,
    c_date              DATE            NOT NULL    DEFAULT         (CURRENT_DATE),
    disp_name           VARCHAR(255)    NOT NULL,
    tab_name            VARCHAR(255)    NOT NULL	UNIQUE,
    width               INT             NOT NULL    DEFAULT         (1024),
    height              INT             NOT NULL    DEFAULT         (1024),
    
    PRIMARY KEY         (canvas_id)
);

CREATE TABLE pc_canvas_2023_09 (
    p_id                INT             NOT NULL    AUTO_INCREMENT,
    p_time              TIMESTAMP       NOT NULL    DEFAULT         (CURRENT_TIMESTAMP),
    color               INT             NOT NULL,
    user_id             INT             NOT NULL,
    offset              INT             NOT NULL, -- y * width + x, we use a single offset for (hopefully) better query performance

    PRIMARY KEY         (p_id),
    FOREIGN KEY         (user_id)       REFERENCES  pc_auth         (user_id)
);
INSERT INTO pc_canvas_list (disp_name, tab_name) VALUES ('Test Canvas', 'pc_canvas_2023_09');

INSERT INTO pc_canvas_2023_09 (offset, color, user_id) VALUES (0, 0, 1), (1, 1, 1), (2, 2, 1), (3, 3, 1), (4, 4, 1), (5, 5, 1), (6, 6, 1), (7, 7, 1), (8, 8, 1), (9, 9, 1), (10, 10, 1), (11, 11, 1), (12, 12, 1), (13, 13, 1), (14, 14, 1), (15, 15, 1);

