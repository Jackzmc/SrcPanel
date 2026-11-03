-- migrate:up
alter table panel_discussion_responses
    change choice choice_id int null;

alter table panel_discussion_responses
    drop foreign key dash_discussion_responses_dash_discussions_id_fk;

alter table panel_discussion_options
    drop foreign key dash_discussion_options_dash_discussions_id_fk;
alter table panel_discussion_comments
    drop foreign key dash_discussion_comments_dash_discussions_id_fk;

alter table panel_discussion_responses
    add constraint dash_discussion_responses_dash_discussions_id_fk
        foreign key (discussion_id) references panel_discussions (id)
            on update cascade on delete cascade,
    add constraint panel_discussion_responses_panel_discussion_options_id_fk
        foreign key (choice_id) references panel_discussion_options (id)
            on update cascade on delete cascade;

alter table panel_discussion_options
    add constraint dash_discussion_options_dash_discussions_id_fk
        foreign key (discussion_id) references panel_discussions (id)
            on update cascade on delete cascade;

alter table panel_discussion_comments
    add constraint dash_discussion_comments_dash_discussions_id_fk
        foreign key (discussion_id) references panel_discussions (id)
            on update cascade on delete cascade;
-- migrate:down

